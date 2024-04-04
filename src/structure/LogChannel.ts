import { TextChannel } from "discord.js";
import { db } from "../method/db";
import { DataCreateOptions } from "../module/DB/Data";
import { InGuildData, InGuildDataOptions } from "./InGuildData";
import { MessageBuilder } from "../module/Bot/MessageBuilder";

export interface LogChannelOptions extends InGuildDataOptions {
    channelId: string;
}
export interface LogChannelDB extends LogChannelOptions {}
export interface LogChannel extends LogChannelDB {}
export class LogChannel extends InGuildData {
    static collection = db.collection<LogChannelDB>('log-channel');
    static manager = new Map<string, LogChannel>();
    constructor(data: LogChannelDB) {
        super(data);
    }

    static async init() {
        const cursor = this.collection.find()
        const list = await cursor.toArray()
        cursor.close();
        list.forEach(data => {
            const instance = new LogChannel(data);
            this.manager.set(data.id, instance);
            instance.init();
        })
    }

    async init() {
        if (!this.channel) await this.delete();
    }

    static async create(options: DataCreateOptions<LogChannelOptions>) {
        const duplicate = await this.collection.findOne({id: options.channelId});
        if (duplicate) throw `此频道已开启为日志模式`
        const data: LogChannelDB = {
            ...options,
            id: options.channelId,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const logChannel = new LogChannel(data);
        this.manager.set(logChannel.id, logChannel);
        return logChannel;
    }

    static log(guildId: string, content: string) {
        const log_channel_list = Array.from(this.manager.values()).filter(log_channel => log_channel.guildId === guildId);
        log_channel_list.forEach(log_channel => log_channel.log(content))
    }

    async log(content: string) {
        await this.channel.send(
            new MessageBuilder()
                .embed(embed => embed
                    .description(content)
                )
                .data
        )
    }

    get channel() {
        return this.guild.channels.cache.get(this.channelId) as TextChannel;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw '此频道尚未开启贴文模式';
        const postChannel = new LogChannel(data);
        this.manager.set(postChannel.id, postChannel);
        return postChannel;
    }

    async delete() {
        LogChannel.manager.delete(this.id);
        await LogChannel.collection.deleteOne({id: this.id});
    }
}