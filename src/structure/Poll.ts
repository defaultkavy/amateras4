import { ButtonStyle, ChatInputCommandInteraction, TextChannel } from "discord.js";
import { config } from "../../bot_config";
import { db } from "../method/db";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Data, DataCreateOptions, DataOptions } from "../module/DB/Data";
import { Snowflake } from "../module/Snowflake";
import { addInteractionListener, getUTCTimestamp } from "../module/Util/util";
import { client } from "../method/client";
import { ErrLog } from "../module/Log/Log";
import { BotClient } from "./BotClient";

export interface PollOptions extends DataOptions {
    ownerUserId: string;
    title: string;
}
export interface PollDB extends PollOptions {
    options: PollOptionDB[];
    messages: {messageId: string, guildId: string, channelId: string, clientId: string}[];
    closed: boolean;
    thumbnailUrl?: string;
    minVotes: number;
    maxVotes: number;
    startTimestamp?: number;
}
export interface Poll extends PollDB {}
export class Poll extends Data {
    static collection = db.collection<PollDB>('poll');
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 4});
    static pollOptionSnowflake = new Snowflake({epoch: config.epoch, workerId: 5});
    constructor(data: PollDB) {
        super(data);
    }

    static async create(options: DataCreateOptions<PollOptions>) {
        const snowflake = this.snowflake.generate(true);
        const data: PollDB = {
            ...options,
            ...snowflake,
            options: [],
            messages: [],
            closed: false,
            minVotes: 1,
            maxVotes: 1
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
        const timestamp = Date.now();
        await Poll.collection.updateOne({id: this.id}, {$set: {startTimestamp: timestamp}});
        this.startTimestamp = timestamp;
        this.pollMessageUpdate();
    }

    panelMessage(ephemeral = false) {
        const builder = new MessageBuilder()
            .embed(embed => {
                const resultMap = this.resultMap;
                const optionText = this.options.map((option, i) => {
                    const percentage = resultMap.get(option.id)
                    return `${i+1}. ${option.label} (**${Intl.NumberFormat('default', {style: 'percent'}).format(percentage ?? 0)}**)`
                }).toString();
                embed
                .color(this.closed ? 'Blue' : this.startTimestamp ? 'Green' : 'Grey')
                .author(`投票 - ${this.closed ? '已结算' : this.startTimestamp ? '开启中' : '未开启'}`)
                .description(`## ${this.title}`)
                .thumbnail(this.thumbnailUrl)
                .field(`选项${this.maxVotes > 1 ? `（最多可选择${this.maxVotes}个）` : ''}`, `${optionText.replaceAll(',', '\n')}`)
                .field('创建者', `<@${this.ownerUserId}>`, true)
                .field('投票人数', `**${this.memberIdList.length}**人参与了投票`, true)
                .emptyField(true)
                .field('更新时间', `<t:${getUTCTimestamp()}:R>`, true)
                if (this.startTimestamp) embed.field('开始时间', `<t:${getUTCTimestamp(this.startTimestamp)}:R>`, true)
                embed.emptyField(true)
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
            .ephemeral(ephemeral)
            return builder
    }

    async sendPollMessage(i: ChatInputCommandInteraction<'cached'>) {
        await i.reply(this.panelMessage().data);
        const message = await i.fetchReply();
        const data = {messageId: message.id, channelId: i.channelId, guildId: i.guildId, clientId: i.client.user.id};
        await Poll.collection.updateOne({id: this.id}, {$push: {messages: data}});
        this.messages.push(data);
    }

    async pollMessageUpdate() {
        this.messages.forEach(detail => {
            const bot = BotClient.get(detail.clientId);
            const channel = bot.client.guilds.cache.get(detail.guildId)
            ?.channels.cache.get(detail.channelId)
            if (channel?.isTextBased()) channel.messages.edit(detail.messageId, this.panelMessage().data).catch(err => {
                Poll.collection.updateOne({id: this.id}, {$pull: {messages: {messageId: detail.messageId}}})
                new ErrLog(err)
            })
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
        this.pollMessageUpdate()
    }

    async removeOption(optionId: string) {
        await Poll.collection.updateOne({id: this.id}, {$pull: {options: {id: optionId}}})
        this.options = this.options.filter(option => option.id !== optionId)
        this.pollMessageUpdate()
        return 
    }

    async editOption(optionId: string, label: string) {
        await Poll.collection.updateOne({id: this.id}, {$set: {'options.$[option].label': label}}, {arrayFilters: [{'option.id': optionId}]});
        this.options.filter(option => option.id === optionId).forEach(option => option.label = label);
        this.pollMessageUpdate()
    }

    async setTitle(title: string) {
        await Poll.collection.updateOne({id: this.id}, {$set: {title: title}});
        this.title = title;
        this.pollMessageUpdate()
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
        this.pollMessageUpdate()
    }

    async close() {
        await Poll.collection.updateOne({id: this.id}, {$set: {closed: true}})
        this.closed = true;
        this.pollMessageUpdate();
    }

    async setThumbnail(url: string) {
        await Poll.collection.updateOne({id: this.id}, {$set: {thumbnailUrl: url}});
        this.thumbnailUrl = url;
        this.pollMessageUpdate();
    }

    async removeThumbnail() {
        await Poll.collection.updateOne({id: this.id}, {$unset: {thumbnailUrl: ''}})
        this.thumbnailUrl = undefined;
        this.pollMessageUpdate();
    }

    async setMax(max: number) {
        if (max > 25) throw '最大选择数量不能超过25、低于1';
        await Poll.collection.updateOne({id: this.id}, {$set: {maxVotes: max, minVotes: max < this.minVotes ? max : undefined}});
        if (max < this.minVotes) this.minVotes = max;
        this.maxVotes = max;
        this.pollMessageUpdate();
    }

    async setMin(min: number) {
        if (min > 25 && min < 1) throw '最小选择数量不能超过25、低于1';
        await Poll.collection.updateOne({id: this.id}, {$set: {maxVotes: min > this.maxVotes ? min : undefined, minVotes: min}});
        if (min > this.maxVotes) this.maxVotes = min;
        this.minVotes = min;
        this.pollMessageUpdate();
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
    await poll.close();
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