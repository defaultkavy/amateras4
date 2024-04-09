import { ButtonStyle, CategoryChannel, ChannelType, Guild, PermissionFlagsBits, TextChannel, User } from "discord.js";
import { client } from "../method/client";
import { InGuildData, InGuildDataOptions } from "./InGuildData";
import { deleteCategory, messageInit } from "../module/Util/channel";
import { db } from "../method/db";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { getUTCTimestamp } from "../module/Util/util";
import { Snowflake } from "../module/Snowflake";
import { config } from "../../bot_config";
import { dangerEmbed, infoEmbed } from "../method/embed";
import { ErrLog } from "../module/Log/Log";
import { VId } from "./VId";
import { LogChannel } from "./LogChannel";
import { BotClient } from "./BotClient";
import { addInteractionListener } from "../module/Util/listener";

export interface LobbyOptions extends InGuildDataOptions {
    name: string;
    ownerUserId: string;
}
export interface LobbyDB extends LobbyOptions {
    categoryId: string;
    textChannelId: string;
    voiceChannelId: string;
    infoChannelId: string;
    infoMessageId?: string;
    memberIdList: string[];
    assetChannelId?: string;
    assetMessageList: {userId: string, messageId: string}[]
}
export interface Lobby extends LobbyDB {}
export class Lobby extends InGuildData {
    static collection = db.collection<LobbyDB>('lobby');
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 0});
    constructor(data: LobbyDB) {
        super(data);
    }

    static async create(options: Omit<LobbyOptions, 'id' | 'timestamp'>) {
        const guild = BotClient.get(options.clientId).client.guilds.cache.get(options.guildId);
        if (!guild) throw 'Guild Missing';
        await guild.roles.fetch();
        const category = await guild.channels.create({
            name: options.name,
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel]},
                {id: options.ownerUserId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels]}
            ]
        })

        const info_channel = await guild.channels.create({
            name: '资讯频道',
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: [
                {id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]},
                {id: options.ownerUserId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], deny: [PermissionFlagsBits.ManageChannels]}
            ]
        })

        const text_channel = await guild.channels.create({
            name: '文字频道',
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: [
                {id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel]},
                {id: options.ownerUserId, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.ManageChannels]}
            ]
        })
        const voice_channel = await guild.channels.create({
            name: '语音频道',
            type: ChannelType.GuildVoice,
            parent: category
        })
        const snowflake = this.snowflake.generate(true);
        const data: LobbyDB = {
            ...options,
            id: snowflake.id,
            timestamp: snowflake.timestamp,
            categoryId: category.id,
            textChannelId: text_channel.id,
            voiceChannelId: voice_channel.id,
            infoChannelId: info_channel.id,
            memberIdList: [options.ownerUserId],
            assetMessageList: [],
        }
        await Lobby.collection.insertOne(data)

        const lobby = new Lobby(data);
        lobby.infoMessageInit();
        new MessageBuilder().embed(infoEmbed(`<@${options.ownerUserId}> 创建了房间`)).send(text_channel);
        LogChannel.log(guild.id, `<@${options.ownerUserId}> 创建了房间：${lobby.name} => ${info_channel}`);
        return lobby;
    }

    static async fetch(id: string) {
        const data = await Lobby.collection.findOne({id: id});
        if (!data) throw 'lobby data not exist';
        return new Lobby(data);
    }

    async infoMessageInit() {
        const message = await messageInit({
            channel: await this.infoChannel(),
            messageId: this.infoMessageId,
            builder: new MessageBuilder()
                .embed(async embed => {
                    const date = getUTCTimestamp();
                    embed
                    .max()
                    .color('Aqua')
                    .description(`# ${this.name}
                    欢迎使用天照的房间功能，以下是可使用的指令：\n- \`/lobby invite\` 邀请其他用户加入房间\n- \`/lobby kick\` 将用户移出房间\n- \`/lobby close\` 关闭房间\n- \`/lobby transfer\` 移交房主权限\n- \`/lobby rename\` 重命名房间\n- \`/lobby leave\` 离开房间`)
                    .field('房间主人', `<@${this.ownerUserId}>`, true)
                    .field('房间人数', `${this.memberIdList.length}`, true)
                    .field('更新时间', `<t:${date}:R>`, false)
                })
                .actionRow(row => {
                    row
                    .button('更新资讯', `lobby_info_update@${this.id}`)
                    .button('离开房间', `lobby_info_leave@${this.id}`, {style: ButtonStyle.Primary})
                    .button('关闭房间', `lobby_info_close@${this.id}`, {style: ButtonStyle.Danger})
                })
        })
        this.infoMessageId = this.infoMessageId;
        await Lobby.collection.updateOne({id: this.id}, {$set: {infoMessageId: message.id}});
    }
    
    async delete(userId?: string) {
        if (this.categoryId) {
            const category = await this.guild.channels.fetch(this.categoryId);
            if (!category) throw 'category not found'
            await deleteCategory(category as CategoryChannel);
        }
        await Lobby.collection.deleteOne({id: this.id});
        if (userId) LogChannel.log(this.guildId, `<@${userId}> 关闭了房间：${this.name}`);
        else LogChannel.log(this.guildId, `系统已将房间关闭：${this.name}`);
    }

    async join(userId: string) {
        this.memberIdList.push(userId);
        await Lobby.collection.updateOne({id: this.id}, {$push: {memberIdList: userId}})
        const category = await this.categoryChannel();
        await category.permissionOverwrites.create(userId, {ViewChannel: true})
        this.infoChannel().then(channel => channel.permissionOverwrites.create(userId, {ViewChannel: true}));
        this.textChannel().then(channel => {
            channel.permissionOverwrites.create(userId, {ViewChannel: true});
            new MessageBuilder().embed(infoEmbed(`<@${userId}> 加入了房间`)).send(channel);
        })
        this.assetChannel().then(channel => channel?.permissionOverwrites.create(userId, {ViewChannel: true}))
        this.infoMessageInit();
        this.sendAssetMessage(userId);
    }

    async leave(userId: string, kick = false) {
        const index = this.memberIdList.indexOf(userId);
        if (index !== -1) {
            this.memberIdList.splice(index, 1);
            await Lobby.collection.updateOne({id: this.id}, {$pull: {memberIdList: userId}});
        }
        const category = await this.categoryChannel();
        await category.permissionOverwrites.delete(userId)
        this.infoChannel().then(channel => channel.permissionOverwrites.delete(userId));
        this.textChannel().then(channel => {
            if (!kick) new MessageBuilder().embed(dangerEmbed(`<@${userId}> 退出了房间`)).send(channel)
            else new MessageBuilder().embed(dangerEmbed(`<@${userId}> 被请出房间`)).send(channel)
            channel.permissionOverwrites.delete(userId)
        })
        this.assetChannel().then(channel => channel?.permissionOverwrites.delete(userId) )
        this.infoMessageInit();
        if (userId === this.ownerUserId) {
            if (this.memberIdList.length) this.transferOwner(this.memberIdList[0]);
            else this.delete();
        }
        this.deleteAssetMessage(userId)
    }

    async transferOwner(userId: string) {
        await this.categoryChannel().then(async channel => {
            if (this.memberIdList.includes(this.ownerUserId)) await channel.permissionOverwrites.create(this.ownerUserId, {ViewChannel: true})
            channel.permissionOverwrites.create(userId, {ViewChannel: true, ManageChannels: true})
        })
        await this.infoChannel().then(async channel => {
            if (this.memberIdList.includes(this.ownerUserId)) await channel.permissionOverwrites.create(this.ownerUserId, {ViewChannel: true})
            channel.permissionOverwrites.create(userId, {ViewChannel: true, SendMessages: true, ManageChannels: false})
        })
        await this.textChannel().then(async channel => {
            if (this.memberIdList.includes(this.ownerUserId)) await channel.permissionOverwrites.create(this.ownerUserId, {ViewChannel: true})
            channel.permissionOverwrites.create(userId, {ViewChannel: true, ManageChannels: false})
        })
        await this.assetChannel().then(async channel => {
            if (!channel) return;
            channel.permissionOverwrites.create(userId, {ViewChannel: true, ManageChannels: false})
        })
        this.ownerUserId = userId;
        await Lobby.collection.updateOne({id: this.id}, {$set: {ownerUserId: userId}});
        this.textChannel().then(channel => {
            new MessageBuilder().embed(infoEmbed(`<@${userId}> 成为了房主`)).send(channel)
        })
        this.infoMessageInit();
    }

    async rename(name: string) {
        this.name = name;
        await Lobby.collection.updateOne({id: this.id}, {$set: {name: name}});
        await this.categoryChannel().then(async channel => {
            await channel.setName(name);
        })
        this.infoMessageInit();
    }

    async setAssetChannel() {
        const asset_channel = await this.guild.channels.create({
            name: '素材频道',
            type: ChannelType.GuildText,
            parent: await this.categoryChannel(),
            permissionOverwrites: [
                {id: this.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel]},
                {id: this.ownerUserId, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.ManageChannels]}
            ]
        })
        this.assetChannelId = asset_channel.id;
        await Lobby.collection.updateOne({id: this.id}, {$set: {assetChannelId: asset_channel.id}})
        this.memberIdList.forEach(async memberId => {
            this.sendAssetMessage(memberId, asset_channel)
            asset_channel.permissionOverwrites.create(memberId, {ViewChannel: true})
        })
    }

    async removeAssetChannel() {
        const asset_channel = await this.assetChannel()
        if (!asset_channel) throw new ErrLog('Lobby: asset channel missing');
        await asset_channel.delete();
        this.assetChannelId = undefined;
        await Lobby.collection.updateOne({id: this.id}, {$unset: {assetChannelId: ''}})
    }

    async sendAssetMessage(userId: string, asset_channel?: TextChannel | null) {
        if (asset_channel === undefined) asset_channel = await this.assetChannel();
        if (!asset_channel) return;
        const vid = await VId.safeFetch(userId);
        if (!vid) return;
        const message = await (await vid.infoMessage(this.bot.client, {asset: true, lobby: true})).send(asset_channel);
        const data = {userId: userId, messageId: message.id};
        this.assetMessageList.push(data);
        await Lobby.collection.updateOne({id: this.id}, {$push: {assetMessageList: data}})
    }

    async deleteAssetMessage(userId: string, asset_channel?: TextChannel | null) {
        const detail = this.assetMessageList.filter(detail => detail.userId === userId)[0]
        if (!detail) return;
        if (asset_channel === undefined) asset_channel = await this.assetChannel();
        if (!asset_channel) return;
        const message = await asset_channel.messages.fetch(detail.messageId).catch(err => undefined)
        if (!message) return;
        message.delete().catch(err => new ErrLog(err));
        await Lobby.collection.updateOne({id: this.id}, {$pull: {assetMessageList: {userId}}})
    }

    async updateAssetMessage(userId: string, builder: MessageBuilder) {
        const detail = this.assetMessageList.filter(detail => detail.userId === userId)[0]
        if (!detail) return;
        const asset_channel = await this.assetChannel();
        if (!asset_channel) return;
        const message = await asset_channel.messages.fetch(detail.messageId).catch(err => undefined)
        if (!message) return;
        message.edit(builder.data).catch(err => new ErrLog(err))
    }

    async categoryChannel(): Promise<CategoryChannel> {
        const category = await this.guild.channels.fetch(this.categoryId);
        if (!category) throw 'lobby category channel null';
        return category as CategoryChannel;
    }

    async textChannel(): Promise<TextChannel> {
        const channel = await this.guild.channels.fetch(this.textChannelId);
        if (!channel) throw 'lobby text channel null';
        return channel as TextChannel;
    }

    async infoChannel(): Promise<TextChannel> {
        const channel = await this.guild.channels.fetch(this.infoChannelId);
        if (!channel) throw 'lobby info channel null';
        return channel as TextChannel;
    }

    async assetChannel(): Promise<TextChannel | null> {
        if (!this.assetChannelId) return null;
        const channel = await this.guild.channels.fetch(this.assetChannelId);
        return channel as TextChannel;
    }

    async owner(): Promise<User> {
        const user = client.users.fetch(this.ownerUserId);
        return user;
    }
}

addInteractionListener('lobby_info_update', async (i) => {
    if (!i.isButton()) return;
    const lobbyId = i.customId.split('@')[1];
    if (!lobbyId) throw 'lobby id undefined';
    const lobby = await Lobby.fetch(lobbyId);
    await lobby.infoMessageInit();
    i.deferUpdate();
})
addInteractionListener('lobby_info_leave', async (i) => {
    if (!i.isButton()) return;
    const lobbyId = i.customId.split('@')[1];
    if (!lobbyId) throw 'lobby id undefined';
    const lobby = await Lobby.fetch(lobbyId);
    await lobby.leave(i.user.id);
    i.deferUpdate();
})
addInteractionListener('lobby_info_close', async (i) => {
    if (!i.isButton()) return;
    const lobbyId = i.customId.split('@')[1];
    if (!lobbyId) throw 'lobby id undefined';
    const lobby = await Lobby.fetch(lobbyId);
    if (lobby.ownerUserId !== i.user.id) throw '你不是房主';
    await lobby.delete(i.user.id);
    i.deferUpdate();
})