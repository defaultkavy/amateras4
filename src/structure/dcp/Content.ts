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
}
export interface ContentDB extends ContentOptions {}
export interface Content extends ContentDB {}
export class Content extends InGuildData {
    static collection = db.collection<ContentDB>('dcp-content');
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
        if (!data) throw 'DCP content not exist';
        const instance = new this(data);
        return instance;
    }

    static async fetchFromReceiveMessage(id: string) {
        const data = await this.collection.findOne({'receiveMessageList.id': id});
        if (!data) throw 'DCP receive message not exist';
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
}

addListener('messageCreate', async message => {
    if (!Content.isValid(message)) return;
    const channel = message.channel;
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) return;
    const send_channel = await SendChannel.fetch(channel.id, message.author.id).catch(err => undefined);
    if (!send_channel) return;
    const dcp_content = await Content.create({
        channelId: message.channelId,
        clientId: message.client.user.id,
        content: message.content,
        guildId: message.guildId,
        messageId: message.id,
        receiveMessageList: [],
        userId: message.author.id
    })
    const followList = await Follow.fetchFromTarget(message.author.id, send_channel.collectionIdList);
    followList.forEach(async follow => {
        const receive_channel_list = await ReceiveChannel.fetchFromList(follow.listId)
        receive_channel_list.forEach(async receiveChannel => {
            const receive_message = await receiveChannel.send(message);
            if (!receive_message) return;
            dcp_content.addMessage({
                webhookId: receive_message.webhook_id as string,
                id: receive_message.id
            });
        })
    })
    message.react('✅').catch(err => undefined);
})

addListener('messageDelete', async message => {
    const dcp_content = await Content.fetch(message.id).catch(err => undefined);
    if (dcp_content) {
        return await dcp_content.delete();
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
    const dcp_content = await Content.fetch(message.id);
    await dcp_content.update(message.content);
    dcp_content.receiveMessageList.forEach(async rm => {
        const data = await ReceiveChannel.collection.findOne({webhookId: rm.webhookId});
        if (!data) return;
        const webhook = new WebhookClient({id: data.webhookId, token: data.webhookToken});
        await webhook.editMessage(rm.id, ReceiveChannel.messageBuilder(message).data).catch(err => undefined);
    })
})