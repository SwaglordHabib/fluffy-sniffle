// const Game: React.FunctionComponent<IGame> = (props: React.PropsWithChildren<IGame>) => {
//     console.log(props.location);
//     const [Player, setPlayer] = React.useState([]);
//     socket.emit('create', { Pin: props.location.state?.Pin });
//     socket.on('joined', (data: any) => setPlayer(data))
//     return <>{Player.map((element:any)=>{
//         return <span>{element.Name}</span>
//     })}</>
// }
export interface IEmit {
    Pin: string;
    Player: string;
}
