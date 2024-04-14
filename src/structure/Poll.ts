import { ButtonStyle, ChatInputCommandInteraction, TextChannel } from "discord.js";
import { db } from "../method/db";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Data, DataCreateOptions, DataOptions } from "../module/DB/Data";
import { getUTCTimestamp } from "../module/Util/util";
import { client } from "../method/client";
import { ErrLog } from "../module/Log/Log";
import { BotClient } from "./BotClient";
import { addInteractionListener } from "../module/Util/listener";
import { snowflakes } from "../method/snowflake";
import { $ } from "../module/Util/text";

export interface PollOptions extends DataOptions {
    ownerUserId: string;
    title: string;
    minVotes?: number;
    maxVotes?: number;
}
export interface PollDB extends PollOptions {
    options: PollOptionDB[];
    messages: {messageId: string, guildId: string, channelId: string, clientId: string}[];
    closed: boolean;
    thumbnailUrl?: string;
    minVotes: number;
    maxVotes: number;
    startTimestamp?: number;
    closeTimestamp?: number;
}
export interface Poll extends PollDB {}
export class Poll extends Data {
    static collection = db.collection<PollDB>('poll');
    static snowflake = snowflakes.poll;
    static pollOptionSnowflake = snowflakes.poll_option;
    constructor(data: PollDB) {
        super(data);
    }

    static async create(options: DataCreateOptions<PollOptions>) {
        const snowflake = this.snowflake.generate(true);
        const data: PollDB = {
            ...snowflake,
            options: [],
            messages: [],
            closed: false,
            minVotes: 1,
            maxVotes: 1,
            ...options,
        }
        await this.collection.insertOne(data)
        return new Poll(data);
    }

    static async fetch(pollId: string) {
        const data = await Poll.collection.findOne({id: pollId});
        if (!data) throw '投票不存在';
        return new Poll(data);
    }

    async delete() {
        this.messages.map(detail => {
            const channel = client.guilds.cache.get(detail.guildId)
            ?.channels.cache.get(detail.channelId);
            if (channel?.isTextBased()) channel.messages.delete(detail.messageId).catch(err => new ErrLog(err))
        })
        await Poll.collection.deleteOne({id: this.id});
    }

    async start() {
        if (!this.options.length) throw '至少需要1个投票选项';
        const timestamp = Date.now();
        await Poll.collection.updateOne({id: this.id}, {$set: {startTimestamp: timestamp}});
        this.startTimestamp = timestamp;
        this.pollMessageUpdateAll();
    }

    panelMessage() {
        const builder = new MessageBuilder()
            .embed(embed => {
                const resultMap = this.resultMap;
                const highestPercentage = [...resultMap.values()].sort((a, b) => b - a)[0];
                const options = this.options.sort((a, b) => b.memberIdList.length - a.memberIdList.length).map((option, i) => {
                    const percentage = resultMap.get(option.id)
                    return $([
                            this.closed && percentage === highestPercentage && percentage !== 0 ? $('bold')`${option.label}` : `${option.label}`, 
                            ` | `,
                            $('bold')`${Intl.NumberFormat('default', {style: 'percent'}).format(percentage ?? 0)}`
                        ])
                });
                embed
                .color(this.closed ? 'Grey' : this.startTimestamp ? `Blurple` : 'Grey')
                .description($([
                    $.H2(this.title),
                    options.map(option => $.Blockquote(option)),
                    $.Line(),
                    $.Line(`投票发起 | `, $.User(this.ownerUserId)),
                    $.If(this.minVotes > 1, () => $.Line(`最少需选 | `, `${this.minVotes}`)),
                    $.If(this.maxVotes > 1, () => $.Line(`最多可选 | `, `${this.maxVotes}`)),
                    $.If(this.startTimestamp, (timestamp) => [
                        $.Line(`开始时间 | `, `<t:${getUTCTimestamp(timestamp)}:R>`),
                    ]),
                    $.If(this.closeTimestamp, (timestamp) => [
                        $.Line('结算时间 | ', $.Timestamp(timestamp, 'relative')),
                    ])
                ]))
                .thumbnail(this.thumbnailUrl)
                .footer(`${this.startTimestamp ? `${this.memberIdList.length}人投票` : '投票未开启'}`)
                .timestamp(new Date().toISOString())
                .max()
            })
            if (this.startTimestamp && !this.closed) builder.actionRow(row => {
                row.stringSelect(`poll_panel_select@${this.id}`, this.options.map(option => ({
                    label: option.label,
                    value: option.id,
                })), {
                    maxValues: this.maxVotes,
                    minValues: this.minVotes
                })
            })
            builder.actionRow(row => {
                if (!this.startTimestamp) row.button('开启投票', `poll_panel_start@${this.id}`, {style: ButtonStyle.Primary})
                if (this.startTimestamp && !this.closed) row.button('结算投票', `poll_panel_close@${this.id}`, {style: ButtonStyle.Danger})
                row.button('更新资讯', `poll_panel_update@${this.id}`)
            })
            return builder
    }

    async sendPollMessage(i: ChatInputCommandInteraction<'cached'>) {
        await i.reply(this.panelMessage().data);
        const message = await i.fetchReply();
        const data = {messageId: message.id, channelId: i.channelId, guildId: i.guildId, clientId: i.client.user.id};
        await Poll.collection.updateOne({id: this.id}, {$push: {messages: data}});
        const oldMessageDataList = this.messages.filter(messageData => messageData.channelId === message.channelId);
        this.messages.push(data);
        for (const oldMessageData of oldMessageDataList) {
            this.pollMessageUpdate(oldMessageData, new MessageBuilder().clean().content(`此投票讯息已迁移至 ${message.url}`));
            this.messages.splice(this.messages.indexOf(oldMessageData), 1);
            await Poll.collection.updateOne({id: this.id}, {$pull: {messages: {messageId: oldMessageData.messageId}}});
        }
    }

    async pollMessageUpdateAll() {
        this.messages.forEach(detail => this.pollMessageUpdate(detail, this.panelMessage()));
    }

    async pollMessageUpdate(message: PollDB['messages'][number], builder: MessageBuilder) {
        const bot = BotClient.get(message.clientId);
        const channel = bot.client.guilds.cache.get(message.guildId)?.channels.cache.get(message.channelId)
        if (channel?.isTextBased()) channel.messages.edit(message.messageId, builder.data).catch(err => {
            Poll.collection.updateOne({id: this.id}, {$pull: {messages: {messageId: message.messageId}}})
            new ErrLog(err)
        })
    }

    async setOption(options: Multiple<DataCreateOptions<PollOptionOptions>>) {
        if (!(options instanceof Array)) options = [options]
        for (const option of options) {
            const snowflake = Poll.pollOptionSnowflake.generate(true);
            const data: PollOptionDB = {
                ...option,
                ...snowflake,
                memberIdList: []
            }
            await Poll.collection.updateOne({id: this.id}, {$push: {options: data}})
            this.options.push(data);
        }
        this.pollMessageUpdateAll()
    }

    async removeOption(optionId: string) {
        await Poll.collection.updateOne({id: this.id}, {$pull: {options: {id: optionId}}})
        this.options = this.options.filter(option => option.id !== optionId)
        this.pollMessageUpdateAll()
        return 
    }

    async editOption(optionId: string, label: string) {
        await Poll.collection.updateOne({id: this.id}, {$set: {'options.$[option].label': label}}, {arrayFilters: [{'option.id': optionId}]});
        this.options.filter(option => option.id === optionId).forEach(option => option.label = label);
        this.pollMessageUpdateAll()
    }

    async setTitle(title: string) {
        await Poll.collection.updateOne({id: this.id}, {$set: {title: title}});
        this.title = title;
        this.pollMessageUpdateAll()
    }

    async select(userId: string, targetIdList: string[]) {
        await Poll.collection.updateOne(
            {id: this.id}, 
            {
                $pull: {'options.$[].memberIdList': userId}, 
            })
        await Poll.collection.updateOne(
            {id: this.id}, 
            {
                $push: {'options.$[option].memberIdList': userId}
            }, {
                arrayFilters: [{
                    'option.id': {$in: targetIdList}
                }]
            })
        this.options.forEach(option => option.memberIdList = option.memberIdList.filter(id => id !== userId));
        this.options.filter(option => targetIdList.includes(option.id)).forEach(option => option.memberIdList.push(userId));
        this.pollMessageUpdateAll()
    }

    async close(annouce?: boolean) {
        this.closeTimestamp = Date.now();
        await Poll.collection.updateOne({id: this.id}, {$set: {closed: true, closeTimestamp: this.closeTimestamp}});
        this.closed = true;
        this.pollMessageUpdateAll();
        if (annouce === false) return;
        this.messages.forEach(async messageData => {
            const bot = BotClient.get(messageData.clientId);
            const channel = bot.client.guilds.cache.get(messageData.guildId)?.channels.cache.get(messageData.channelId)
            if (!channel?.isTextBased()) return;
            const message = await channel.messages.fetch(messageData.messageId).catch(err => undefined);
            if (!message) return;
            channel.send(new MessageBuilder().content(`投票：${$('bold')`${this.title}`} 已结算，点击 ${message.url} 查看。`).data)
        })
    }

    async setThumbnail(url: string) {
        await Poll.collection.updateOne({id: this.id}, {$set: {thumbnailUrl: url}});
        this.thumbnailUrl = url;
        this.pollMessageUpdateAll();
    }

    async removeThumbnail() {
        await Poll.collection.updateOne({id: this.id}, {$unset: {thumbnailUrl: ''}})
        this.thumbnailUrl = undefined;
        this.pollMessageUpdateAll();
    }

    async setMax(max: number) {
        if (max > 25) throw '最大选择数量不能超过25、低于1';
        await Poll.collection.updateOne({id: this.id}, {$set: {maxVotes: max, minVotes: max < this.minVotes ? max : undefined}});
        if (max < this.minVotes) this.minVotes = max;
        this.maxVotes = max;
        this.pollMessageUpdateAll();
    }

    async setMin(min: number) {
        if (min > 25 && min < 1) throw '最小选择数量不能超过25、低于1';
        await Poll.collection.updateOne({id: this.id}, {$set: {maxVotes: min > this.maxVotes ? min : undefined, minVotes: min}});
        if (min > this.maxVotes) this.maxVotes = min;
        this.minVotes = min;
        this.pollMessageUpdateAll();
    }

    get memberIdList() {
        const memberSet = new Set<string>()
        this.options.forEach(option => {
            option.memberIdList.forEach(id => memberSet.add(id))
        })
        return [...memberSet]
    }

    get resultMap() {
        const optionMap = new Map<string, number>;
        this.options.forEach(option => {
            optionMap.set(option.id, this.memberIdList.length === 0 ? 0 : option.memberIdList.length / this.memberIdList.length);
        })
        return optionMap
    }
}

export interface PollOptionOptions extends DataOptions {
    label: string;
}
export interface PollOptionDB extends PollOptionOptions {
    memberIdList: string[];
}

addInteractionListener('poll_panel_update', async i => {
    if (!i.isButton()) return;
    const pollId = i.customId.split('@')[1];
    if (!pollId) throw 'poll id missing';
    const poll = await Poll.fetch(pollId);
    i.update(poll.panelMessage().data);
})

addInteractionListener('poll_panel_select', async i => {
    if (!i.isStringSelectMenu()) return;
    const pollId = i.customId.split('@')[1];
    if (!pollId) throw 'poll id missing';
    const poll = await Poll.fetch(pollId);
    await poll.select(i.user.id, i.values)
    i.deferUpdate();
})

addInteractionListener('poll_panel_close', async i => {
    if (!i.isButton()) return;
    const pollId = i.customId.split('@')[1];
    if (!pollId) throw 'poll id missing';
    const poll = await Poll.fetch(pollId);
    if (poll.ownerUserId !== i.user.id) throw '你不是投票创建者'
    await poll.close(true);
    i.deferUpdate();
})

addInteractionListener('poll_panel_start', async i => {
    if (!i.isButton()) return;
    const pollId = i.customId.split('@')[1];
    if (!pollId) throw 'poll id missing';
    const poll = await Poll.fetch(pollId);
    if (poll.ownerUserId !== i.user.id) throw '你不是投票创建者'
    await poll.start();
    i.deferUpdate();
})