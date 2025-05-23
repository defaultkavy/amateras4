import { ChannelType, Guild, Message, PartialMessage } from "discord.js";
import { db } from "../method/db";
import { addClientListener, addListener } from "../module/Util/listener";
import emojiRegex from "emoji-regex";

export interface $MessageDB {
    id: string;
    guildId: string;
    timestamp: number;
    authorId: string;
    channelId: string;
    parentChannelId: string | null;
    contentLength: number;
    bot: boolean;
    reactions: $MessageEmojiData[];
    parentChannelType: ChannelType | null;
    channelType: ChannelType;
    stickers: string[];
    attachments: $MessageAttachmentData[],
    emojis: $MessageEmojiData[]
    interaction?: $MessageInteractionData;
}
export interface $Message extends $MessageDB {}

export class $Message {
    static collection = db.collection<$MessageDB>('message');
    constructor(data: $MessageDB) {
        Object.assign(this, data);
    }

    static async create(message: Message) {
        if (this.isValid(message) === false) return;
        const data: $MessageDB = this.messageData(message);
        await this.collection.insertOne(data);
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw 'Message data not found';
        return new this(data);
    }

    static async delete(id: string) {
        await $Message.collection.deleteOne({id: id});
    }

    static async update(message: Message | PartialMessage) {
        if (this.isValid(message) === false) return;
        this.collection.updateOne({id: message.id}, {
            $set: this.messageData(message)
        })
    }

    static messageData(message: Message<true>): $MessageDB {
        message.content.match(emojiRegex())
        return {
            id: message.id,
            authorId: message.author.id,
            channelId: message.channelId,
            guildId: message.guildId,
            timestamp: message.createdTimestamp,
            parentChannelId: message.channel.isThread() ? message.channel.parentId : null,
            contentLength: message.content.length,
            bot: message.author.bot,
            reactions: [...message.reactions.cache.values()].filter(reaction => {
                let count = reaction.count;
                [...reaction.users.cache.values()].forEach(user => {
                    if (user.bot) count -= 1;
                })
                return count;
            }).map(reaction => ({
                id: reaction.emoji.id,
                name: reaction.emoji.name,
                identifier: reaction.emoji.identifier,
                count: reaction.count,
                animated: reaction.emoji.animated
            })),
            channelType: message.channel.type,
            parentChannelType: message.channel.parent ? message.channel.parent.type : null,
            stickers: message.stickers.map(sticker => sticker.id),
            attachments: message.attachments.map(attachment => ({
                id: attachment.id,
                contentType: attachment.contentType,
                url: attachment.url,
                name: attachment.name
            })),
            emojis: this.getEmojiFromContent(message.content),
            interaction: message.interaction ? {
                id: message.interaction.id,
                userId: message.interaction.user.id,
                commandName: message.interaction.commandName
            } : undefined
        }
    }

    static isValid(message: Message | PartialMessage): message is Message<true> {
        if (message.flags.has("Ephemeral")) return false; // skip ephemeral message
        if (message.system) return false; // skip system message
        if (message.inGuild() === false) return false; // skip private message
        if (!message.author) return false; // skip if author is null
        if (message.author.bot && !message.interaction) return false; // skip bot message with not interaction object
        return true
    }

    static getEmojiFromContent(str: string): $MessageEmojiData[] {
        const emojiMap = new Map<string, $MessageEmojiData>();
        for (const [emojiIdentifier] of str.matchAll(emojiRegex())) {
            const data = emojiMap.get(emojiIdentifier) ?? {name: null, count: 0, identifier: emojiIdentifier, id: null, animated: null}
            if (emojiMap.has(emojiIdentifier) === false) emojiMap.set(emojiIdentifier, data)
            data.count += 1;
        }
        for (const [_, animated, emojiIdentifier, emojiName, emojiId] of str.matchAll(/<(a?):((.+?):([0-9]+))>/g)) {
            const data = emojiMap.get(emojiIdentifier) ?? {name: emojiName, count: 0, identifier: emojiIdentifier, id: emojiId, animated: !!animated}
            if (emojiMap.has(emojiName) === false) emojiMap.set(emojiIdentifier, data)
            data.count += 1;
        }
        return Array.from(emojiMap.values());
    }
}
export interface $MessageEmojiData {
    count: number;
    identifier: string;
    id: string | null;
    name: string | null;
    animated: boolean | null;
}

export interface $MessageAttachmentData {
    id: string;
    contentType: string | null;
    name: string;
    url: string;
}

export interface $MessageInteractionData {
    userId: string;
    commandName: string;
    id: string;
}

addListener('messageCreate', async message => $Message.create(message))
addListener('messageDelete', async message => $Message.delete(message.id))
addListener('messageUpdate', async (_, message) => $Message.update(message))
addListener('messageReactionRemoveAll', async (message) => $Message.update(message))
addListener('messageReactionAdd', async ({message}) => $Message.update(message))
addListener('messageReactionRemove', async ({message}) => $Message.update(message))
addListener('messageReactionRemoveEmoji', async ({message}) => $Message.update(message))
addListener('channelDelete', async channel => {
    if (channel.isDMBased()) return;
    $Message.collection.deleteMany({channelId: channel.id});
    $Message.collection.deleteMany({parentChannelId: channel.id});
})

addListener('threadDelete', async thread => {
    $Message.collection.deleteMany({channelId: thread.id});
})