import { ChannelType, ForumChannel, GuildForumTag, MessageType } from "discord.js";
import { db } from "../method/db";
import { InGuildDataOptions, InGuildData } from "./InGuildData";
import { DataCreateOptions } from "../module/DB/Data";
import { addListener } from "../module/Util/util";

export interface AutoTagOptions extends InGuildDataOptions {
    channelId: string;
    tagId: string;
}
export interface AutoTagDB extends AutoTagOptions {}
export interface AutoTag extends AutoTagDB {}

export class AutoTag extends InGuildData {
    static collection = db.collection<AutoTagDB>('autotag');
    static manager = new Map<string, AutoTag>();
    constructor(data: AutoTagDB) {
        super(data);
    }

    check() {
        if (!this.channel) {this.delete(); return false}
        if (!this.channel.availableTags.find(tag => tag.id === this.id)) {this.delete(); return false}
        return true;
    }

    get channel() {
        return this.guild.channels.cache.get(this.channelId) as ForumChannel;
    }

    get tag() {
        return this.channel.availableTags.find(tag => tag.id === this.id) as GuildForumTag
    }

    async init() {
        this.check();
    }

    static async create(options: DataCreateOptions<AutoTagOptions>) {
        const duplicate = await this.collection.findOne({id: options.tagId, tagId: options.tagId});
        if (duplicate) throw `该标签已经是自动标签了`
        const data: AutoTagDB = {
            ...options,
            id: options.tagId,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const autotag = new this(data);
        this.manager.set(autotag.id, autotag);
        return autotag;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw '此标签未设置成自动标签';
        const postChannel = new this(data);
        this.manager.set(postChannel.id, postChannel);
        return postChannel;
    }

    static async fetchListFromForum(forumId: string) {
        const cursor = await this.collection.find({channelId: forumId});
        const list = await cursor.toArray()
        cursor.close();
        return list.map(data => {
            const instance = new this(data);
            this.manager.set(data.id, instance);
            return instance;
        })
    }

    async delete() {
        AutoTag.manager.delete(this.id);
        await AutoTag.collection.deleteOne({id: this.id});
    }
}

addListener('threadCreate', async thread => {
    const forumChannel = thread.parent;
    if (!(forumChannel && forumChannel.type === ChannelType.GuildForum)) return;
    const autoTagList = await AutoTag.fetchListFromForum(forumChannel.id);
    autoTagList.forEach(autotag => {
        if (autotag.check()) thread.edit({
            appliedTags: [autotag.tagId]
        })
    })
})

addListener('guildDelete', async guild => {
    AutoTag.collection.deleteMany({guildId: guild.id, clientId: guild.client.user.id})
})

addListener('channelDelete', async channel => {
    AutoTag.manager.forEach(autotag => {
        if (autotag.channelId === channel.id) autotag.delete();
    })
})