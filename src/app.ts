import { MongoClient } from "mongodb";
import { Server, Socket } from "socket.io";
import { PerformNextPoll } from "./helpers/PerformNextPoll";
import { calculatePoints } from "./helpers/calculatePoints";
import { clearVotes } from "./helpers/clearVotes";
import { IQuestion, Type } from "./interfaces/IQuestion";
import { IPlayer } from "./interfaces/IPlayer";
import { createServer } from "http";

const app = createServer();

export const io = new Server(app, {
  serveClient: false,
});

const mongouri = `mongodb://127.0.0.1:27017/gssapiServiceName=mongodb`;

export const polls: any[] = [];

export const DRUNKENPOLLS = "Drunkenpolls";
export const GAMES = "Games";
const EMIT_SOCKET = "socket";
const EMIT_JOINED = "joined";
export const EMIT_NEXT = "next";

io.sockets.on("connection", (socket: Socket) => {
  console.log("Connection", socket.id);

  socket.on("create", async (data) => {
    socket.join(data.Pin);
    console.log("Room: ", data.Pin);

    const client = new MongoClient(mongouri);

    try {
      await client.connect();
      console.log("Connectet to Mongodb");

      await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .insertOne({
          Pin: "" + data.Pin + "",
          Player: [
            { Name: data.Player, Points: 0, Role: "GM", connection: socket.id },
          ],
          Creation: new Date().toISOString(),
        });

      let result = await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .findOne({ Pin: "" + data.Pin + "" });
      io.sockets.in(data.Pin).emit(EMIT_SOCKET, socket.id);
      io.sockets.in(data.Pin).emit(EMIT_JOINED, result.Player);
    } catch (error) {
      io.sockets.in(data.Pin).emit(EMIT_JOINED, "An Error occurred");
      console.error(`${new Date()}|${error}`);
    } finally {
      await client.close();
    }
  });

  // TODO: nextPoll needs a more suitable name. Maybe nextRound?
  socket.on("nextPoll", async (poll) => {
    console.log(poll);

    socket.join(poll.Pin);

    const client = new MongoClient(mongouri);

    try {
      await client.connect();
      console.log("Connected to Mongodb");

      let result = await client
        .db(DRUNKENPOLLS)
        .collection(DRUNKENPOLLS)
        .aggregate([{ $sample: { size: 1 } }])
        .toArray();
      console.log(result);

      // TODO: maybe an interface for question
      let question: IQuestion = result[0];
      let game;

      game = PerformNextPoll(poll, question, game, client);

      await timeout();
      // TODO: caluculate round result
      game = await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .findOne({ Pin: `${poll.Pin}` });

      switch (question.type) {
        case Type.Estimate:
          let differences = game.Player.map((player: any) => {
            let po = polls.filter((p) => p.SocketId === player.connection)[0];
            let diff = Math.abs(po.Estimate - question.answere);
            return { ...player, OfBy: diff };
          });
          differences.sort((a: any, b: any) => a.OfBy - b.OfBy);
          differences = calculatePoints(differences);
          let newplayers = game.Player.map((player: IPlayer) => {
            player.Points =
              parseInt(player.Points) +
              parseInt(
                differences.filter(
                  (d: IPlayer) => d.connection === player.connection
                )[0].Points
              ).toString();
            return player;
          });
          await client
            .db(DRUNKENPOLLS)
            .collection(GAMES)
            .updateOne({ Pin: poll.Pin }, { $set: { Player: newplayers } });
          io.in(poll.Pin).emit(EMIT_NEXT, {
            Poll: 2,
            Pin: poll.Pin,
            Player: calculatePoints(differences),
          });
          break;

        default:
          break;
      }

      clearVotes(poll);

      // Player should be something like {Name:"",Points:"+1",...something else}
      // io.in(poll.Pin).emit(EMIT_NEXT, { Poll: 2, Pin: poll.Pin, Player: game.Player });
    } catch (error) {
      console.error(`${new Date()}|${error}`);
    } finally {
      await client.close();
    }
  });

  socket.on("nextState", async (data) => {
    socket.join(data.Pin);

    const client = new MongoClient(mongouri);

    try {
      await client.connect();

      let game = await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .findOne({ Pin: `${data.Pin}` });
      io.in(data.Pin).emit(EMIT_NEXT, {
        Poll: 0,
        Pin: data.Pin,
        Player: game.Player,
      });
    } catch (error) {
      console.error(`${new Date()}|${error}`);
    } finally {
      await client.close();
    }
  });

  socket.on("vote", async (poll) => {
    console.log(poll);

    socket.join(poll.Pin);

    const client = new MongoClient(mongouri);

    try {
      await client.connect();
      console.log("Connected to Mongodb");
      polls.push({
        Pin: poll.Pin,
        Estimate: poll.Estimate,
        SocketId: socket.id,
      });

      io.in(poll.Pin).emit("voted", { voted: true });
    } catch (error) {
      console.error(`${new Date()}|${error}`);
    } finally {
      await client.close();
    }
  });

  socket.on("join", async (data) => {
    socket.join(data.Pin);

    const client = new MongoClient(mongouri);

    try {
      await client.connect();
      console.log("Connectet to Mongodb");
      console.log(data);

      let game = await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .findOne({ Pin: data.Pin });
      let playerarray = game.Player;

      playerarray.push({
        Name: data.Player,
        Points: 0,
        Role: "Player",
        connection: socket.id,
      });

      await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .updateOne({ Pin: data.Pin }, { $set: { Player: playerarray } });

      let result = await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .findOne({ Pin: data.Pin });

      // io.sockets.in(data.Pin).emit('socket', socket.id)
      console.log(result.Player);

      io.in(data.Pin).emit(EMIT_JOINED, result.Player);
    } catch (error) {
      console.error(`${new Date()}|${error}`);
    } finally {
      await client.close();
    }
  });

  socket.on("disconnect", async (reason) => {
    const client = new MongoClient(mongouri);

    try {
      await client.connect();
      console.log("Connectet to Mongodb");

      let game = await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .findOne({ "Player.connection": socket.id });
      let pin = game.Pin;
      let playerindex = game.Player.findIndex(
        (x: IPlayer) => x.connection === socket.id
      );
      game.Player.splice(playerindex, 1);

      await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .updateOne({ Pin: pin }, { $set: { Player: game.Player } });

      let result = await client
        .db(DRUNKENPOLLS)
        .collection(GAMES)
        .findOne({ Pin: pin });

      console.log(result);

      io.sockets.in(pin).emit(EMIT_JOINED, result.Player);

      console.log("disconnect", reason);
    } catch (error) {
      console.error(`${new Date()}|${error}`);
    } finally {
      await client.close();
    }
  });
});

app.listen(3000);

let timeout = () => new Promise((resolve) => setTimeout(resolve, 20 * 1000));
