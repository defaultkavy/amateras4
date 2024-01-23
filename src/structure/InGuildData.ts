import { Data, DataOptions } from "../module/DB/Data";
import { BotClient } from "./BotClient";

export interface InGuildDataOptions extends DataOptions {
    guildId: string;
    clientId: string;
}
export interface InGuildData extends InGuildDataOptions {}
export class InGuildData extends Data {
    constructor(options: InGuildDataOptions) {
        super(options);
    }

    get guild() {
        const guild = this.bot.client.guilds.cache.get(this.guildId);
        if (!guild) throw 'guild missing';
        return guild
    }

    get bot() {
        return BotClient.get(this.clientId);
    }
}