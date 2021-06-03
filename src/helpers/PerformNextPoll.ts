import { io, EMIT_NEXT, DRUNKENPOLLS, GAMES } from '../app';
import { IQuestion, Type } from '../interfaces/IQuestion';

export const PerformNextPoll = (poll: any, question: IQuestion, game: any, client: any) => {
    var operation: { [type: string]: () => void; } = {};
    operation[Type.Estimate] = () => {
        EMIT_(poll, question);
    };
    operation[Type.Player] = async () => {
        game = await GetGame(client, poll);

        console.log(game.Player);

        question.possibilitys = game.Player;

        EMIT_(poll, question);
    };
    operation[Type.Selection] = () => {
        EMIT_(poll, question);
    };
    operation[Type.Battle] = async () => {
        game = await GetGame(client, poll);

        let max = game.Player.length;
        let players = [];

        players.push(game.player[Math.floor(Math.round(1000 + Math.random() * max))].Name);
        players.push(game.player[Math.floor(Math.round(1000 + Math.random() * max))].Name);

        question.possibilitys = players;

        EMIT_(poll, question);
    };
    operation[Type.Search] = () => {
        EMIT_(poll, question);
    };

    operation[question.type];
    return game;
};
const EMIT_ = (poll: any, question: IQuestion) => {
    io.in(poll.Pin).emit(EMIT_NEXT, { Poll: 1, Question: question });
}

async function GetGame(client: any, poll: any): Promise<any> {
    return await client.db(DRUNKENPOLLS).collection(GAMES).findOne({ Pin: `${poll.Pin}` });
}

