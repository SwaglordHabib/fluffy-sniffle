export interface IQuestion {
    question: string;
    answere: number;
    possibilitys: any[];
    type: Type;
}

export enum Type {
    Estimate = "Estimate",
    Player = "Player",
    Selection = "Selection",
    Battle = "Battle",
    Search = "Search"
}