import { ChannelType, Guild, Message } from "discord.js";
import { db } from "../method/db";
import { addListener } from "../module/Util/util";

export interface GuildMessageDB {
    id: string;
    guildId: string;
    timestamp: number;
    authorId: string;
    channelId: string;
    parentChannelId: string | null;
    hasContent: boolean;
    hasAttachment: boolean;
    bot: boolean;
    reactions: {
        emojiIdentifier: string;
        count: number;
    }[];
    parentChannelType: ChannelType | null;
    channelType: ChannelType;
}
export interface GuildMessage extends GuildMessageDB {}

export class GuildMessage {
    static collection = db.collection<GuildMessageDB>('message');
    constructor(data: GuildMessageDB) {
        Object.assign(this, data);
    }

    static async create(message: Message<true>) {
        const data: GuildMessageDB = this.messageData(message)
        await this.collection.insertOne(data);
        const instance = new this(data);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw 'Message data not found';
        return new this(data);
    }

    async delete() {
        await GuildMessage.collection.deleteOne({id: this.id});
    }

    static async delete(id: string) {
        await GuildMessage.collection.deleteOne({id: id});
    }

    static async update(message: Message<true>) {
        this.collection.updateOne({id: message.id}, {
            $set: this.messageData(message)
        })
    }

    static messageData(message: Message<true>): GuildMessageDB {
        return {
            id: message.id,
            authorId: message.author.id,
            channelId: message.channelId,
            guildId: message.guildId,
            timestamp: message.createdTimestamp,
            parentChannelId: message.channel.isThread() ? message.channel.parentId : null,
            hasContent: !!message.content.length,
            hasAttachment: !!message.attachments.size,
            bot: message.author.bot,
            reactions: [...message.reactions.cache.values()].map(reaction => ({
                emojiIdentifier: reaction.emoji.identifier,
                count: reaction.count
            })),
            channelType: message.channel.type,
            parentChannelType: message.channel.parent ? message.channel.parent.type : null
        }
    }
}

addListener('messageCreate', async message => {
    if (message.system) return;
    if (message.interaction) return;
    if (message.inGuild() === false) return;
    if (!message.author) return;
    GuildMessage.create(message);
})

addListener('messageDelete', async message => {
    if (message.system) return;
    if (message.interaction) return;
    if (message.inGuild() === false) return;
    if (!message.author) return;
    GuildMessage.delete(message.id);
})

addListener('messageUpdate', async message => {
    if (message.system) return;
    if (message.interaction) return;
    if (message.inGuild() === false) return;
    if (!message.author) return;
    GuildMessage.update(message);
})

addListener('messageReactionAdd', async ({message}) => {
    if (message.system) return;
    if (message.interaction) return;
    if (message.inGuild() === false) return;
    if (!message.author) return;
    GuildMessage.update(message);
})

addListener('messageReactionRemove', async ({message}) => {
    if (message.system) return;
    if (message.interaction) return;
    if (message.inGuild() === false) return;
    if (!message.author) return;
    GuildMessage.update(message);
})

addListener('channelDelete', async channel => {
    if (channel.isDMBased()) return;
    GuildMessage.collection.deleteMany({channelId: channel.id});
    GuildMessage.collection.deleteMany({parentChannelId: channel.id});
})

addListener('threadDelete', async thread => {
    GuildMessage.collection.deleteMany({channelId: thread.id});
})