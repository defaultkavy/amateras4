import { ButtonStyle, ChannelType, Invite, Message, WebhookClient } from "discord.js";
import { db } from "../../method/db";
import { DataCreateOptions } from "../../module/DB/Data";
import { InGuildDataOptions, InGuildData } from "../InGuildData";
import { $Guild } from "../$Guild";
import { $ } from "../../module/Util/text";
import { Embed } from "../../module/Bot/Embed";
import { List } from "./List";
import { MessageBuilder } from "../../module/Bot/MessageBuilder";

export interface ReceiveChannelOptions extends InGuildDataOptions {
    userId: string;
    channelId: string;
    listIdList: string[];
}
export interface ReceiveChannelDB extends ReceiveChannelOptions {
    webhookId: string;
    webhookToken: string;
}
export interface ReceiveChannel extends ReceiveChannelDB {}
export class ReceiveChannel extends InGuildData {
    static collection = db.collection<ReceiveChannelDB>('dcn-receive-channel');
    constructor(data: ReceiveChannelDB) {
        super(data);
    }

    static async create(options: DataCreateOptions<ReceiveChannelOptions>) {
        const webhookData = await this.createWebhook(options.guildId, options.channelId);
        const data: ReceiveChannelDB = {
            ...options,
            webhookId: webhookData.id,
            webhookToken: webhookData.token,
            id: options.channelId,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        return instance;
    }

    static async fetch(id: string, userId: string) {
        const data = await this.collection.findOne({id, userId});
        if (!data) throw 'DCN receive channel not exist';
        const instance = new this(data);
        return instance;
    }

    static async fetchFromUser(userId: string) {
        const list = await this.collection.find({userId}).toArray();
        return list.map(data => new this(data));
    }

    static async fetchFromList(listId: string) {
        const list = await this.collection.find({listIdList: listId}).toArray();
        return list.map(data => new this(data));
    }

    get webhook() {
        return new WebhookClient({id: this.webhookId, token: this.webhookToken})
    }

    static async createWebhook(guildId: string, channelId: string) {
        const channel = $Guild.get(guildId).guild.channels.cache.get(channelId);
        if (!channel || (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildForum && channel.type !== ChannelType.GuildAnnouncement)) throw 'Channel not supported';
        const webhooks = await channel.fetchWebhooks();
        const receive_channel_data = await this.collection.findOne({webhookId: {$in: webhooks.map(w => w.id)}});
        return receive_channel_data ? {
            id: receive_channel_data.webhookId,
            token: receive_channel_data.webhookToken
        } : await channel.createWebhook({name: `天照网络`}).then(w => ({
            id: w.id,
            token: w.token as string
        }))
    }

    async addList(listId: string) {
        this.listIdList.push(listId);
        await ReceiveChannel.collection.updateOne({id: this.id, userId: this.userId}, {$push: {
            listIdList: listId
        }})
    }

    async removeList(listId: string) {
        this.listIdList.splice(this.listIdList.indexOf(listId), 1);
        await ReceiveChannel.collection.updateOne({id: this.id, userId: this.userId}, {$pull: {
            listIdList: listId
        }})
    }

    async fetch_Lists() {
        return List.fetchList(this.listIdList);
    }

    async infoEmbed() {
        const lists = await this.fetch_Lists();

        return new Embed()
            .description($([
                $.Line(`频道 | `, $.Channel(this.channelId)),
                lists.length 
                    ? [
                        $.Line(`列表`),
                        lists.map(l => $.Blockquote(l.name))
                    ]
                    : $.Line(`列表 | 无`)
            ]))
            .footer(`Discord 内容发布管理`)
    }

    async delete() {
        await ReceiveChannel.collection.deleteOne({id: this.id, userId: this.userId})
        const webhookUsed = await ReceiveChannel.collection.findOne({webhookId: this.webhookId});
        if (!webhookUsed) this.webhook.delete();
    }

    async send(message: Message<true>, title?: string) {
        return await this.webhook.send(ReceiveChannel.messageBuilder(message, title).data).catch(err => undefined);
    }

    static messageBuilder(message: Message<true>, title?: string) {
        const images = message.attachments.filter(att => att.contentType?.startsWith('image/')).map((img) => img);
        const image0 = images.splice(0, 1)[0];
        const embed0 = new Embed()
            .image(image0?.url)
            .author(message.author.username, {icon_url: message.author.displayAvatarURL()})
            .url(message.url)
            .description(message.content)
            .footer(message.guild.name, message.guild.iconURL())
            .timestamp(new Date(message.createdTimestamp).toISOString())
            .color(message.member?.displayColor)
            .title(title)

        const embeds = images.map((img, i) => {
            const embed = new Embed()
                .image(img.url)
                .footer(message.guild.name, message.guild.iconURL())
                .timestamp(new Date(message.createdTimestamp).toISOString())
            if (i < 3) {
                embed.url(message.url);
            } else if (i < 7) {
                embed.url(message.url + '#1')
            } else if (i < 11) {
                embed.url(message.url + '#2')
            }
            return embed;
        })
            
        return new MessageBuilder()
            .content($([$.H3(`${message.author.username} 发布了内容`)]))
            .embed(embed0)
            .embed(embeds)
            .actionRow(row => {
                row.link('信息链接', message.url)
            })
    }
}