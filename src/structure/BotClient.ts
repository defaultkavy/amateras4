import { Client, ClientUser } from "discord.js";
import { config } from "../../bot_config";
import { db } from "../method/db";
import { Data, DataCreateOptions, DataOptions } from "../module/DB/Data";
import { ErrLog, Log } from "../module/Log/Log";
import { CommandManager } from "../module/Bot/CommandManager";
import { Chat } from "./Chat";
import { CLIENT_OPTIONS } from "../method/client";
import { System } from "./System";
import { cmd_sys } from "../command/sys/sys";
import { $Guild } from "./$Guild";
import { cmd_list } from "../../cmdList";
import { startListen, addClientListener } from "../module/Util/listener";
import { $Member } from "./$Member";
import { snowflakes } from "../method/snowflake";
import { AutoRole } from "./AutoRole";
import { AutoTweet } from "./AutoTweet";

export interface BotClientOptions extends DataOptions {
    token: string;
    ownerUserId: string;
}
export interface BotClientDB extends BotClientOptions {
    username: string;
    avatarURL: string | null;
}
export interface BotClient extends BotClientDB {}

export class BotClient extends Data {
    static collection = db.collection<BotClientDB>('bot-client');
    static snowflake = snowflakes.bot;
    static manager = new Map<string, BotClient>();
    client: Client<true>;
    cmd_manager: CommandManager;
    constructor(data: BotClientDB, client: Client<true>) {
        super(data);
        this.client = client;
        this.cmd_manager = new CommandManager(this.client).add(cmd_list);
    }

    static async create(options: DataCreateOptions<BotClientOptions>) {
        let bot_client = new Client(CLIENT_OPTIONS);
        await bot_client.login(options.token);
        await new Promise<void>(resolve => {
            bot_client.once('ready', client => {
                bot_client = client;
                resolve();
            })
        })
        if (!bot_client.isReady()) throw 'BotClient.create(): client is not ready after login';
        new Log(`Login <${bot_client.user.username}(${bot_client.user.id})>`)
        const data: BotClientDB = {
            ...options,
            id: bot_client.user.id,
            timestamp: Date.now(),
            username: bot_client.user.username,
            avatarURL: bot_client.user.avatarURL({size: 1024})
        }
        this.collection.insertOne(data);
        const instance = new BotClient(data, bot_client);
        this.manager.set(instance.id, instance);
        instance.init();
        return instance;
    }

    static async init(debug = false) {
        const cursor = this.collection.find();
        const list = await cursor.toArray();
        cursor.close();
        // Login all bot
        await Promise.all(list.map(async data => {
            let bot_client = new Client(CLIENT_OPTIONS);
            try {
                await bot_client.login(data.token);
                await new Promise<void>(resolve => {
                    bot_client.once('ready', client => {
                        bot_client = client;
                        resolve();
                    })
                })
                if (!bot_client.isReady()) throw 'BotClient.init(): client is not ready after login';
                new Log(`Login <${bot_client.user.username}(${bot_client.user.id})>`)
            } catch(err) {
                new ErrLog(err);
                return;
            }
            const bot = new BotClient(data, bot_client as Client<true>);
            this.manager.set(bot.id, bot);
            return await bot.init(debug);
        }))
        // Function Init
        await AutoTweet.init();
    }

    async init(debug = false) {
        await this.update(this.client.user);
        // guilds init
        const guilds = await $Guild.init(this.client, debug);
        if (debug) return;
        // commands deploy
        if (!config.debug) {
            new Log('Deploying Global Commands');
            await this.cmd_manager.deployGlobal()
            new Log('Global Commands Deployed');
        }
        if (!config.debug) await this.cmd_manager.deployGuilds(guilds.filter(guild => !System.servers.includes(guild.id)));
        this.cmd_manager.add(cmd_sys)
        const adminGuilds = guilds.filter(guild => System.servers.includes(guild.id))
        if (adminGuilds && !config.debug) await this.cmd_manager.deployGuilds(adminGuilds)
        // function init
        await Chat.init(this.client.user.id);
        await AutoRole.init(this.client.user.id);
        //
        startListen(this.client);
        this.cmd_manager.listen();
    }

    static get(id: string) {
        const bot = this.manager.get(id);
        if (!bot) throw new ErrLog(`BotClient missing`)
        return bot
    }

    static getClientGuild(clientId: string, guildId: string) {
        return this.manager.get(clientId)?.client.guilds.cache.get(guildId);
    }

    static getFromGuild(guildId: string) {
        return Array.from(this.manager.values()).filter(bot => bot.client.guilds.cache.has(guildId));
    }

    async update(user: ClientUser) {
        await BotClient.collection.updateOne({id: this.id}, {$set: {
            username: user.username,
            avatarURL: user.avatarURL({size: 1024})
        }})
        this.username = user.username;
        this.avatarURL = user.avatarURL({size: 1024})
    }

    async delete(callback?: () => Promise<void>) {
        await BotClient.collection.deleteOne({id: this.id});
        BotClient.manager.delete(this.id);
        if (callback) await callback()
        await this.client.destroy();
    }

    static getUser(userId: string) {
        return [...BotClient.manager.values()].map(bot => [bot.client.users.cache.get(userId), [...bot.client.users.cache.values()].find(user => user.username === userId)]).flat().find(user => user !== undefined)
    }

    get inviteUrl() {
        return `https://discord.com/api/oauth2/authorize?client_id=${this.client.user.id}&permissions=8&scope=bot`
    }
}

addClientListener('userUpdate', (o, user) => {
    if (user.id !== user.client.user.id) return;
    const bot = BotClient.get(user.id);
    bot.update(bot.client.user)
})