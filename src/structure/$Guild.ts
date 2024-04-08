import { Client, Guild } from "discord.js";
import { UserPlayer } from "./user-player/Player";
import { Log } from "../module/Log/Log";
import { addListener } from "../module/Util/util";
import { BotClient } from "./BotClient";

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

    static get(guildId: string) {
        return this.manager.get(guildId) as $Guild;
    }
}
addListener('guildCreate', async guild => {
    new Log(`Joining ${guild.name} <${guild.client.user.username}(${guild.client.user.id})>`)
    const bot = BotClient.get(guild.client.user.id);
    await $Guild.init(bot.client);
    await bot.cmd_manager.deployGuilds([guild]);
})

addListener('guildDelete', guild => {
    new Log(`Leaving ${guild.name} <${guild.client.user.username}(${guild.client.user.id})>`)
    if ([...BotClient.manager.values()].filter(bot => bot.client.guilds.cache.get(guild.id)).length === 0) $Guild.manager.delete(guild.id);
})