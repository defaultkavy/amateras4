import { SendableChannels } from "discord.js";
import { db } from "../method/db";
import { InGuildData, InGuildDataOptions } from "./InGuildData";
import { ErrLog } from "../module/Log/Log";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { addClientListener } from "../module/Util/listener";
import { snowflakes } from "../method/snowflake";

export interface WelcomeMessageOptions extends InGuildDataOptions {
    channelId: string;
    content: string;
}
export interface WelcomeMessageDB extends WelcomeMessageOptions {}
export interface WelcomeMessage extends WelcomeMessageDB {}
export class WelcomeMessage extends InGuildData {
    static collection = db.collection<WelcomeMessageDB>('welcome-message');
    static snowflake = snowflakes.welcome;
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

    async channel(): Promise<SendableChannels> {
        const channel = await this.guild.channels.fetch(this.channelId);
        if (!channel) throw new ErrLog('WelcomeMessage: channel undefined');
        if (!channel.isSendable()) throw new ErrLog('WelcomeMessage: Channel is not sendable');
        return channel;
    }
}

addClientListener('guildMemberAdd', async member => {
    const welcome = await WelcomeMessage.fetch(member.guild.id)
    if (!welcome) return;
    welcome.send(member.id);
})