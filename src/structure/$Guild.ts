import { Client, Guild } from "discord.js";
import { Log } from "../module/Log/Log";
import { addListener } from "../module/Util/listener";
import { BotClient } from "./BotClient";

export class $Guild {
    id: string;
    guild: Guild;
    clientId: string;
    static manager = new Map<string, $Guild[]>();
    constructor(guild: Guild) {
        this.guild = guild;
        this.id = guild.id;
        this.clientId = guild.client.user.id;
    }

    static async init(client: Client) {
        await client.guilds.fetch();
        const guilds = [...client.guilds.cache.values()];
        for (const guild of guilds) {
            const $guild = new $Guild(guild);
            const $guildList = this.manager.get(guild.id) ?? [$guild];
            if (this.manager.has(guild.id) === false) this.manager.set(guild.id, $guildList);
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
    }

    static get(guildId: string) {
        return this.manager.get(guildId)?.at(0) as $Guild;
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