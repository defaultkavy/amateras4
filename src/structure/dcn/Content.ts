import { APIMessage, ChannelType, Message, PartialMessage, WebhookClient } from "discord.js";
import { db } from "../../method/db";
import { DataCreateOptions } from "../../module/DB/Data";
import { InGuildData, InGuildDataOptions } from "../InGuildData";
import { BotClient } from "../BotClient";
import { ReceiveChannel } from "./ReceiveChannel";
import { Follow } from "./Follow";
import { SendChannel } from "./SendChannel";
import { addListener } from "../../module/Util/listener";

export interface ContentOptions extends InGuildDataOptions {
    userId: string;
    channelId: string;
    content: string;
    messageId: string;
    receiveMessageList: {
        id: string,
        webhookId: string
    }[];
    title?: string;
}
export interface ContentDB extends ContentOptions {}
export interface Content extends ContentDB {}
export class Content extends InGuildData {
    static collection = db.collection<ContentDB>('dcn-content');
    constructor(data: ContentDB) {
        super(data);
    }

    static async create(options: DataCreateOptions<ContentOptions>) {
        const data: ContentDB = {
            ...options,
            id: options.messageId,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id});
        if (!data) throw 'DCN content not exist';
        const instance = new this(data);
        return instance;
    }

    static async fetchFromReceiveMessage(id: string) {
        const data = await this.collection.findOne({'receiveMessageList.id': id});
        if (!data) throw 'DCN receive message not exist';
        const instance = new this(data);
        return instance;
    }

    async addMessage(message: ContentOptions['receiveMessageList'][number]) {
        this.receiveMessageList.push(message);
        await Content.collection.updateOne({id: this.id}, {$push: {receiveMessageList: message}});
    }

    async removeMessage(messageId: string) {
        const message = this.receiveMessageList.find(data => data.id === messageId);
        if (!message) return;
        this.receiveMessageList.splice(this.receiveMessageList.indexOf(message), 1);
        await Content.collection.updateOne({id: this.id}, {$pull: {'receiveMessageList.id': messageId}});
    }

    async delete() {
        this.receiveMessageList.forEach(async message => {
            const data = await ReceiveChannel.collection.findOne({webhookId: message.webhookId});
            if (!data) return;
            const webhook = new WebhookClient({id: data.webhookId, token: data.webhookToken});
            webhook.deleteMessage(message.id).catch(err => console.debug(err));
        })
        await Content.collection.deleteOne({id: this.id});
    }

    static isValid(message: Message): message is Message<true> {
        if (message.author.bot) return false;
        if (message.system) return false;
        if (message.interaction) return false;
        if (message.inGuild() === false) return false;
        return true;
    }

    async update(content: string) {
        this.content = content;
        await Content.collection.updateOne({id: this.id}, {$set: {content}})
    }

    static async send(channelId: string, message: Message<true>, title?: string) {
        const send_channel = await SendChannel.fetch(channelId, message.author.id).catch(err => undefined);
        if (!send_channel) return;
        const dcn_content = await Content.create({
            channelId: message.channelId,
            clientId: message.client.user.id,
            content: message.content,
            guildId: message.guildId,
            messageId: message.id,
            receiveMessageList: [],
            userId: message.author.id,
            title
        })
        const followList = await Follow.fetchFromTarget(message.author.id, send_channel.collectionIdList);
        followList.forEach(async follow => {
            const receive_channel_list = await ReceiveChannel.fetchFromList(follow.listId)
            receive_channel_list.forEach(async receiveChannel => {
                const receive_message = await receiveChannel.send(message);
                if (!receive_message) return;
                dcn_content.addMessage({
                    webhookId: receive_message.webhook_id as string,
                    id: receive_message.id
                });
            })
        })
        message.react('✅').catch(err => undefined);
    }
}

addListener('messageCreate', async message => {
    if (!Content.isValid(message)) return;
    const channel = message.channel;
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) return;
    Content.send(channel.id, message);
})

addListener('messageDelete', async message => {
    const dcn_content = await Content.fetch(message.id).catch(err => undefined);
    if (dcn_content) {
        return await dcn_content.delete();
    }

    const receive_message = await Content.fetchFromReceiveMessage(message.id).catch(err => undefined);
    await receive_message?.removeMessage(message.id)
})

addListener('messageUpdate', async (_, message) => {
    if (message.partial) message = await message.fetch();
    if (!Content.isValid(message)) return;
    await message.reactions.resolve('✅')?.users.remove();
    const channel = message.channel;
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) return;
    const send_channel = await SendChannel.fetch(channel.id, message.author.id).catch(err => undefined);
    if (!send_channel) return;
    const dcn_content = await Content.fetch(message.id);
    await dcn_content.update(message.content);
    dcn_content.receiveMessageList.forEach(async rm => {
        const data = await ReceiveChannel.collection.findOne({webhookId: rm.webhookId});
        if (!data) return;
        const webhook = new WebhookClient({id: data.webhookId, token: data.webhookToken});
        await webhook.editMessage(rm.id, ReceiveChannel.messageBuilder(message).data).catch(err => undefined);
    })
})

addListener('threadCreate', async (thread) => {
    if (!thread.parent) return;
    if (thread.parent.type !== ChannelType.GuildForum) return;
    const message = await thread.fetchStarterMessage();
    if (!message) return;
    Content.send(thread.parent.id, message, thread.name);
})