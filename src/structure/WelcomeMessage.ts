import { TextBasedChannel } from "discord.js";
import { db } from "../method/db";
import { Snowflake } from "../module/Snowflake";
import { InGuildData, InGuildDataOptions } from "./InGuildData";
import { ErrLog } from "../module/Log/Log";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { addListener } from "../module/Util/util";
import { config } from "../../bot_config";

export interface WelcomeMessageOptions extends InGuildDataOptions {
    channelId: string;
    content: string;
}
export interface WelcomeMessageDB extends WelcomeMessageOptions {}
export interface WelcomeMessage extends WelcomeMessageDB {}
export class WelcomeMessage extends InGuildData {
    static collection = db.collection<WelcomeMessageDB>('welcome-message');
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 1});
    constructor(data: WelcomeMessageDB) {
        super(data);
    }

    static async create(options: Omit<WelcomeMessageOptions, 'id' | 'timestamp'>) {
        const snowflake = this.snowflake.generate(true);
        const data: WelcomeMessageDB = {
            ...options,
            id: snowflake.id,
            timestamp: snowflake.timestamp
        }
        await WelcomeMessage.collection.insertOne(data)
        return new WelcomeMessage(data);
    }

    static async fetch(guildId: string) {
        const data = await WelcomeMessage.collection.findOne({guildId: guildId})
        if (!data) return;
        return new WelcomeMessage(data);
    }

    async send(userId: string) {
        this.channel().then(channel => {
            const content = this.content.replaceAll('$member', `<@${userId}>`)
            new MessageBuilder().content(content).send(channel);
        })
    }

    async delete() {
        await WelcomeMessage.collection.deleteOne({id: this.id});
    }

    async channel(): Promise<TextBasedChannel> {
        const channel = await this.guild.channels.fetch(this.channelId);
        if (!channel) throw new ErrLog('WelcomeMessage: channel undefined');
        if (!channel.isTextBased()) throw new ErrLog('WelcomeMessage: channel not text base');
        return channel;
    }
}

addListener('guildMemberAdd', async member => {
    const welcome = await WelcomeMessage.fetch(member.guild.id)
    if (!welcome) return;
    welcome.send(member.id);
})