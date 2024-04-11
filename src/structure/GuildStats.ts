import { db } from "../method/db";
import { InGuildDataOptions, InGuildData } from "./InGuildData";
import { DataCreateOptions } from "../module/DB/Data";
import { Embed } from "../module/Bot/Embed";
import { ActionRow, ButtonStyle, Guild, GuildTextBasedChannel } from "discord.js";
import { $Message } from "./$Message";
import { mode } from "../module/Util/util";
import { $ } from "../module/Util/text";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { addInteractionListener, addListener } from "../module/Util/listener";
import { $Guild } from "./$Guild";
import { Log } from "../module/Log/Log";
import { $Member } from "./$Member";
import { Skill } from "./Skill";
import { Reply } from "../module/Bot/Reply";

export interface GuildStatsOptions extends InGuildDataOptions {
    channelId: string;
    messageId: string;
}
export interface GuildStatsDB extends GuildStatsOptions {}
export interface GuildStats extends GuildStatsDB {}

export class GuildStats extends InGuildData {
    static collection = db.collection<GuildStatsDB>('guild-stats');
    static manager = new Map<string, GuildStats>();
    constructor(data: GuildStatsDB) {
        super(data);
    }

    static async init(guildId: string) {
        const cursor = this.collection.find({guildId})
        const list = await cursor.toArray()
        cursor.close();
        const messageBuilder = await this.infoMessage($Guild.get(guildId).guild);
        list.forEach(async data => {
            const instance = new this(data);
            this.manager.set(data.id, instance);
            await instance.init(messageBuilder);
        })
    }

    static async create(options: DataCreateOptions<GuildStatsOptions>) {
        const duplicateInChannel = await this.fetchFromChannel(options.channelId)
        if (duplicateInChannel) await duplicateInChannel.delete();
        const data: GuildStatsDB = {
            ...options,
            id: options.messageId,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw 'Guild stats message not found';
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    async init(messageBuilder: MessageBuilder) {
        try {
            const channel = this.channel;
            if (!channel) return this.delete();
            const message = await channel.messages.fetch(this.messageId);
            if (!message) return this.delete();
            await message.edit(messageBuilder.data);
        } catch(err) {
            new Log(`${err}`)
        }
    }

    async delete() {
        try {
            this.message?.delete();
        } catch(err) {}
        GuildStats.manager.delete(this.id);
        await GuildStats.collection.deleteOne({id: this.id});
    }

    static async fetchFromChannel(channelId: string) {
        const data = await this.collection.findOne({channelId});
        if (!data) return;
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    get channel() {
        return this.guild.channels.cache.get(this.channelId) as GuildTextBasedChannel | undefined;
    }

    get message() {
        return this.channel?.messages.cache.get(this.messageId);
    }

    static async infoMessage(guild: Guild) {
        return new MessageBuilder().embed(await this.infoEmbed(guild))
            .actionRow(row => 
                row
                .button('查看名片', 'guild-stats-member', {style: ButtonStyle.Primary})
                .button('技能排行', 'guild-stats-skill-ranking', {style: ButtonStyle.Primary})
                .button('更新资讯', 'guild-stats-update', {style: ButtonStyle.Secondary})
            )
    }

    static async infoEmbed(guild: Guild) {
        const timestamp24hrs = Date.now() - 60_000 * 60 * 24;
        const cursor = $Message.collection.find({guildId: guild.id, timestamp: {$gte: timestamp24hrs}})
        const messageDataList = await cursor.toArray();
        const mostActiveChannelIdList = mode(messageDataList.map(data => data.channelId)).map(data => data.values).flat().splice(0, 3);
        const emojiList = messageDataList
            .map(data => [...data.emojis, ...data.reactions])
            .flat()
            .filter(emoji => !emoji.id || guild.emojis.cache.has(emoji.id))
        const emojiIdentifierList = emojiList.map(emoji => emoji.identifier)
        const mostUsedEmojiList = mode(emojiIdentifierList) 
            .map(data => data.values) 
            .flat() 
            .splice(0, 5)
            .map(identifier => ({
                identifier,
                animated: emojiList.find(emoji => emoji.identifier === identifier)?.animated
            }))
        cursor.close()
        return new Embed()
            .author(guild.name, {icon_url: guild.iconURL()})
            .description($.Text([
                $.H3(`Server Info`),
                $.Blockquote(`成员人数 | `, $('bold')`${guild.memberCount}`),
                $.Blockquote(`创建日期 | `, $.Timestamp(guild.createdTimestamp, 'long-date')),
                $.H3(`Server Activities From ${$.Timestamp(timestamp24hrs, 'relative')}`),
                    $.Blockquote(`消息数量 | `), 
                    $.Bold(`${messageDataList.length}`),
                    mostUsedEmojiList.length ? [
                        $.Blockquote(`常用表情 | `), 
                        $.Text(`${mostUsedEmojiList.map(emoji => $.Emoji(emoji.identifier, emoji.animated)).toString().replaceAll(',', ' ')}`) 
                    ] : null,
                    mostActiveChannelIdList.length ? [
                        $.Blockquote(`活跃频道`), 
                        $.Blockquote(
                            mostActiveChannelIdList.map(id => $.Line(`| ${ $.Channel(id) }`, $('bold')` (${ messageDataList.filter(data => data.channelId === id).length })`))
                        )
                    ] : null,
                
                $.H3(`System Info`),
                $.Blockquote(`系统上线于 `, $.Timestamp(guild.client.readyTimestamp, 'relative'))
            ]))
            .footer(`天照系统`)
            .timestamp(new Date().toISOString())
            .color(0x00ffff)
            .max()
    }
}

addInteractionListener('guild-stats-update', async i =>{
    if (i.isButton() === false) return;
    if (!i.guild) return;
    i.update((await GuildStats.infoMessage(i.guild)).data)
})
addInteractionListener('guild-stats-member', async i =>{
    if (i.isButton() === false) return;
    if (!i.inGuild()) return;
    const $member = await $Member.fetchFromMember(i.guildId, i.user.id);
    return (await $member.cardMessage()).ephemeral(true);
})
addInteractionListener('guild-stats-skill-ranking', async i =>{
    if (i.isButton() === false) return;
    if (!i.inGuild()) return;
    return new Reply().embed(await Skill.rankingEmbed(i.guildId))
})

addListener('guildMemberAdd', (member) => {
    GuildStats.init(member.guild.id)
})