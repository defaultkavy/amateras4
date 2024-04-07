import { Client, Guild } from "discord.js";
import { UserPlayer } from "./user-player/Player";

export class $Guild {
    guild: Guild;
    static manager = new Map<string, $Guild>();
    constructor(guild: Guild) {
        this.guild = guild;
    }

    static async init(client: Client) {
        await client.guilds.fetch();
        const guilds = [...client.guilds.cache.values()];
        const cachedGuilds = guilds.filter(guild => this.manager.has(guild.id));
        const uncacheGuilds = guilds.filter(guild => !this.manager.has(guild.id));
        for (const guild of uncacheGuilds) {
            const $guild = this.manager.get(guild.id) ?? new $Guild(guild);
            if (this.manager.has(guild.id) === false) this.manager.set(guild.id, $guild);
            await $guild.init();
        }
        return guilds;
    }

    async init() {
        await Promise.all([
            this.guild.fetch(),
            this.guild.channels.fetch(),
            this.guild.members.fetch(),
        ])
        await UserPlayer.init(this.guild);
    }

    static get(guild: Guild) {
        return this.manager.get(guild.id) as $Guild;
    }
}