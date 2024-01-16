import { Guild } from "discord.js";
import { Data, DataOptions } from "../module/DB/Data";
import { client } from "../method/client";

export interface InGuildDataOptions extends DataOptions {
    guildId: string;
}
export interface InGuildData extends InGuildDataOptions {}
export class InGuildData extends Data {
    constructor(options: InGuildDataOptions) {
        super(options);
    }

    get guild(): Guild { return client.guilds.cache.get(this.guildId) as Guild }
}