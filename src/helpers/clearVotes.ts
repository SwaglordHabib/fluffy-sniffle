import { polls } from '../app';
import { IPoll } from '../interfaces/IPoll';

export const clearVotes = (poll: IPoll) => {
    while (polls.findIndex((p) => p.Pin === poll.Pin) != -1) {
        console.log("Removed:", polls.findIndex((p) => p.Pin === poll.Pin));
        polls.splice(polls.findIndex((p) => p.Pin === poll.Pin), 1);
    }
};
