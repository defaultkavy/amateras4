import { GuildTextBasedChannel, MessageType, TextChannel, ThreadAutoArchiveDuration } from "discord.js";
import { db } from "../method/db";
import { DataCreateOptions } from "../module/DB/Data";
import { addListener } from "../module/Util/util";
import { InGuildData, InGuildDataOptions } from "./InGuildData";

export interface PostChannelOptions extends InGuildDataOptions {
    channelId: string;
}
export interface PostChannelDB extends PostChannelOptions {}
export interface PostChannel extends PostChannelDB {}

export class PostChannel extends InGuildData {
    static collection = db.collection<PostChannelDB>('post-mode');
    static manager = new Map<string, PostChannel>();
    constructor(data: PostChannelDB) {
        super(data);
    }

    static async init() {
        const cursor = this.collection.find()
        const list = await cursor.toArray()
        cursor.close();
        list.forEach(data => {
            const instance = new PostChannel(data)
            this.manager.set(data.id, instance)
        })
    }

    static async create(options: DataCreateOptions<PostChannelOptions>) {
        const duplicate = await PostChannel.collection.findOne({id: options.channelId});
        if (duplicate) throw `此频道已开启为贴文模式`
        const data: PostChannelDB = {
            ...options,
            id: options.channelId,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const postChannel = new PostChannel(data);
        this.manager.set(postChannel.id, postChannel);
        const topic = postChannel.channel.topic?.replace('【贴文模式】', '');
        postChannel.channel.setTopic(`【贴文模式】${topic ?? ''}`).catch();
        return postChannel;
    }

    static async fetch(id: string) {
        const data = await PostChannel.collection.findOne({id: id});
        if (!data) throw '此频道尚未开启贴文模式';
        const postChannel = new PostChannel(data);
        this.manager.set(postChannel.id, postChannel);
        return postChannel;
    }

    async delete() {
        PostChannel.manager.delete(this.id);
        await PostChannel.collection.deleteOne({id: this.id});
        if (this.channel) {
            const topic = this.channel.topic;
            if (topic) this.channel.setTopic(topic.replace('【贴文模式】', '')).catch()
        }
    }

    get channel() {
        return this.guild.channels.cache.get(this.channelId) as TextChannel;
    }
}

addListener('messageCreate', async message => {
    if (!message.inGuild()) return;
    if (message.type === MessageType.ChatInputCommand || message.type === MessageType.ContextMenuCommand) return;
    const postChannel = PostChannel.manager.get(message.channelId);
    if (!postChannel) return;
    if (message.client.user.id !== postChannel.clientId) return;
    try {
        message.react('❤️')
        message.react('🥰')
        message.react('🤣')
        message.react('😡')
        message.react('😥')
        if (!message.hasThread) {
            const thread = await message.startThread({
                name: `贴文留言`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
            })
            thread.setArchived()
        }
    } catch (err) {
        new Error(`${err}`)
    }
})

addListener('guildDelete', async guild => {
    PostChannel.collection.deleteMany({guildId: guild.id, clientId: guild.client.user.id})
})

addListener('channelDelete', async channel => {
    PostChannel.manager.forEach(postChannel => {
        if (postChannel.channelId === channel.id) postChannel.delete();
    })
})