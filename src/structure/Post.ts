import { ThreadAutoArchiveDuration } from "discord.js";
import { db } from "../method/db";
import { DataCreateOptions } from "../module/DB/Data";
import { addListener } from "../module/Util/util";
import { InGuildData, InGuildDataOptions } from "./InGuildData";

export interface PostModeOptions extends InGuildDataOptions {
    channelId: string;
}
export interface PostModeDB extends PostModeOptions {}
export interface PostMode extends PostModeDB {}

export class PostMode extends InGuildData {
    static collection = db.collection<PostModeDB>('post-mode');
    static manager = new Map<string, PostMode>();
    constructor(data: PostModeDB) {
        super(data);
    }

    static async init() {
        const cursor = this.collection.find()
        const list = await cursor.toArray()
        cursor.close();
        list.forEach(data => {
            const instance = new PostMode(data)
            this.manager.set(data.id, instance)
        })
    }

    static async create(options: DataCreateOptions<PostModeOptions>) {
        const duplicate = await PostMode.collection.findOne({id: options.channelId});
        if (duplicate) throw `此频道已开启为贴文模式`
        const data: PostModeDB = {
            ...options,
            id: options.channelId,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const postChannel = new PostMode(data);
        this.manager.set(postChannel.id, postChannel);
        return postChannel;
    }

    static async fetch(id: string) {
        const data = await PostMode.collection.findOne({id: id});
        if (!data) throw '此频道尚未开启贴文模式';
        const postChannel = new PostMode(data);
        this.manager.set(postChannel.id, postChannel);
        return postChannel;
    }

    async delete() {
        PostMode.manager.delete(this.id);
        await PostMode.collection.deleteOne({id: this.id});
    }
}

addListener('messageCreate', async message => {
    if (!message.inGuild()) return;
    const postChannel = PostMode.manager.get(message.channelId);
    if (!postChannel) return;
    if (message.client.user.id !== postChannel.clientId) return;
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
})

addListener('guildDelete', async guild => {
    PostMode.collection.deleteMany({guildId: guild.id, clientId: guild.client.user.id})
})