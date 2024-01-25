import { ButtonStyle, ChannelType, DMChannel, MessageType, TextChannel } from "discord.js";
import { config } from "../../bot_config";
import { db } from "../method/db";
import { DataCreateOptions } from "../module/DB/Data";
import { Snowflake } from "../module/Snowflake";
import { addInteractionListener, addListener } from "../module/Util/util";
import { InGuildData, InGuildDataOptions } from "./InGuildData";
import { MessageBuilder } from "../module/Bot/MessageBuilder";

export interface ChatOptions extends InGuildDataOptions {
    userId: string;
    channelId: string;
}
export interface ChatDB extends ChatOptions {
    infoMessageId: string | null;
}
export interface Chat extends ChatDB {}

export class Chat extends InGuildData {
    static collection = db.collection<ChatDB>('chat');
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 7});
    static manager = new Map<string, Chat>();
    constructor(data: ChatDB) {
        super(data);
    }

    static async init(clientId: string) {
        const cursor = this.collection.find({clientId: clientId});
        const list = await cursor.toArray();
        cursor.close();
        list.forEach(data => {
            const chat = new Chat(data);
            this.manager.set(chat.id, chat);
        })
    }

    static async create(options: DataCreateOptions<ChatOptions>) {
        const snowflake = this.snowflake.generate(true)
        const data: ChatDB = {
            ...options,
            ...snowflake,
            infoMessageId: null
        }
        await this.collection.insertOne(data);
        const instance = new Chat(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static get(clientId: string, userId: string) {
        return [...this.manager.values()].find(chat => chat.clientId === clientId && chat.userId === userId);
    }

    async send(content: string) {
        this.channel.send(new MessageBuilder().content(content).data)
        this.updateInfo();
    }

    async delete() {
        await Chat.collection.deleteOne({id: this.id});
        Chat.manager.delete(this.userId);
    }

    infoMessage() {
        return new MessageBuilder().embed(embed => {
            embed.color('Yellow')
            .description(`聊天模式已开启\n当前频道：${this.channel}`)
        }).actionRow(row => {
            row.button('关闭聊天模式', 'chat_close', {style: ButtonStyle.Danger})
        })
    }

    async updateInfo() {
        const user = await this.bot.client.users.fetch(this.userId);
        if (!user.dmChannel) throw `User DMChannel null`;
        const send = async (channel: DMChannel) => {
            const newMessage = await channel.send(this.infoMessage().data);
            await Chat.collection.updateOne({id: this.id}, {$set: {infoMessageId: newMessage.id}});
            this.infoMessageId = newMessage.id;
            return;
        }
        if (this.infoMessageId) {
            const message = await user.dmChannel.messages.fetch(this.infoMessageId).catch(err => undefined);
            if (user.dmChannel.lastMessageId !== this.infoMessageId) {
                message?.delete();
                await send(user.dmChannel);
            }
        }
        else {
            await send(user.dmChannel);
        }
    }

    get channel(): TextChannel {
        return this.guild.channels.cache.get(this.channelId) as TextChannel;
    }
}

addListener('messageCreate', message => {
    if (message.author.bot) return;
    if (message.channel.type !== ChannelType.DM) return;
    const chat = Chat.get(message.client.user.id, message.author.id);
    if (!chat) return;
    if (chat.clientId !== message.client.user.id) return;
    chat.send(message.content);
})

addInteractionListener('chat_close', async i => {
    if (!i.isButton()) return;
    await i.deferSlient();
    const chat = Chat.get(i.client.user.id, i.user.id);
    if (!chat) throw '该聊天模式已不存在';
    await chat.delete();
    i.update(new MessageBuilder().clean().embed(embed => {
        embed.color('Grey')
        .description('聊天模式已关闭')
    }).data)
})