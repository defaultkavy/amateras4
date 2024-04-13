import { Client, Guild } from "discord.js";
import { Log } from "../module/Log/Log";
import { addClientListener } from "../module/Util/listener";
import { BotClient } from "./BotClient";
import { GuildStats } from "./GuildStats";
import { setIntervalAbsolute } from "../module/Util/util";
import { $Member } from "./$Member";

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

    static async init(client: Client, debug = false) {
        await client.guilds.fetch();
        const guilds = [...client.guilds.cache.values()];
        for (const guild of guilds) {
            await this.create(guild);
        }
        return guilds;
    }

    async init(debug = false) {
        await Promise.all([
            this.guild.fetch(),
            this.guild.channels.fetch(),
            this.guild.members.fetch(),
        ])
        await $Member.init(this.guild)
        GuildStats.init(this.clientId, this.id);
        // await MusicPlayer.init(this.clientId, this.id);
        // MusicPlayerPanel.init(this.clientId, this.id);
        setIntervalAbsolute(5, 'minute', () => GuildStats.init(this.clientId, this.id));
    }

    static get(guildId: string) {
        return this.manager.get(guildId)?.at(0) as $Guild;
    }

    static async create(guild: Guild) {
        const $guild = new $Guild(guild);
        const $guildList = this.manager.get(guild.id) ?? [$guild];
        if (this.manager.has(guild.id) === false) this.manager.set(guild.id, $guildList);
        await $guild.init();
    }

    get bot() {
        return BotClient.get(this.clientId);
    }
}
addClientListener('guildCreate', async guild => {
    new Log(`Joining ${guild.name} <${guild.client.user.username}(${guild.client.user.id})>`)
    await $Guild.create(guild);
    await BotClient.get(guild.client.user.id).cmd_manager.deployGuilds([guild]);
})

addClientListener('guildDelete', guild => {
    new Log(`Leaving ${guild.name} <${guild.client.user.username}(${guild.client.user.id})>`)
    if ([...BotClient.manager.values()].filter(bot => bot.client.guilds.cache.get(guild.id)).length === 0) $Guild.manager.delete(guild.id);
})