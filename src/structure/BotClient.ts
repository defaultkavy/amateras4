import { Client } from "discord.js";
import { config } from "../../bot_config";
import { db } from "../method/db";
import { Data, DataCreateOptions, DataOptions } from "../module/DB/Data";
import { Snowflake } from "../module/Snowflake";
import { startListen } from "../module/Util/util";
import { ErrLog, Log } from "../module/Log/Log";
import { CommandManager } from "../module/Bot/CommandManager";
import { cmd_list } from "../../index";

export interface BotClientOptions extends DataOptions {
    token: string;
}
export interface BotClientDB extends BotClientOptions {}
export interface BotClient extends BotClientDB {}

export class BotClient extends Data {
    static collection = db.collection<BotClientDB>('bot-client');
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 6});
    static manager = new Map<string, BotClient>();
    client: Client<true>;
    cmd_manager: CommandManager;
    constructor(data: BotClientDB, client: Client<true>) {
        super(data);
        this.client = client;
        this.cmd_manager = new CommandManager(this.client).add(cmd_list);
    }

    static async create(options: DataCreateOptions<BotClientOptions>) {
        const bot_client = new Client({intents: ['GuildMembers', 'MessageContent', 'GuildIntegrations', 'GuildMessages', 'Guilds']})
        await bot_client.login(options.token);
        if (!bot_client.isReady()) throw 'Bot client login error';
        const data: BotClientDB = {
            ...options,
            id: bot_client.user.id,
            timestamp: Date.now()
        }
        this.collection.insertOne(data);
        const instance = new BotClient(data, bot_client);
        this.manager.set(instance.id, instance);
        instance.init();
        return instance;
    }

    static async init() {
        const cursor = this.collection.find();
        const list = await cursor.toArray();
        cursor.close();
        list.forEach(async data => {
            new Log(`Login to bot client: ${data.id}`)
            const bot_client = new Client({intents: ['GuildMembers', 'MessageContent', 'GuildIntegrations', 'GuildMessages', 'Guilds']})
            try {
                await bot_client.login(data.token);
            } catch(err) {
                new ErrLog(err);
                return;
            }
            const bot = new BotClient(data, bot_client as Client<true>);
            this.manager.set(bot.id, bot);
            await bot.init();
        })
    }

    async init() {
        startListen(this.client);
        // fetching
        await this.client.guilds.fetch();
        const guilds = [...this.client.guilds.cache.values()];
        for (const guild of guilds) {
            await guild.fetch();
            await guild.channels.fetch()
        }
        if (!config.debug) await this.cmd_manager.deployGuilds(guilds)
        this.cmd_manager.listen();
    }

    static get(id: string) {
        const bot = this.manager.get(id);
        if (!bot) throw new ErrLog(`BotClient missing`)
        return bot
    }

    get inviteUrl() {
        return `https://discord.com/api/oauth2/authorize?client_id=${this.client.user.id}&permissions=8&scope=bot`
    }
}