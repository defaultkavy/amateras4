import { InGuildData, InGuildDataOptions } from "./InGuildData";
import { db } from "../method/db";
import { DataCreateOptions } from "../module/DB/Data";
import { Embed } from "../module/Bot/Embed";
import { addClientListener } from "../module/Util/listener";
import { $Message } from "./$Message";
import { ChannelType, Guild } from "discord.js";
import { $ } from "../module/Util/text";
import { countArrayItem, mode } from "../module/Util/util";
import { $Member } from "./$Member";
import { $Guild } from "./$Guild";
import { snowflakes } from "../method/snowflake";

export interface SkillOptions extends InGuildDataOptions {
    name: string;
    channelIdList: string[];
    threshold: number;
    intro: string;
}
export interface SkillDB extends SkillOptions {}
export interface Skill extends SkillDB {}

export class Skill extends InGuildData {
    static collection = db.collection<SkillDB>('skill');
    static manager = new Map<string, Skill>();
    static snowflake = snowflakes.skill;
    constructor(data: SkillDB) {
        super(data);
    }

    static async init(guild: Guild) {
        const cursor = this.collection.find({guildId: guild.id})
        const list = await cursor.toArray()
        cursor.close();
        list.forEach(data => {
            const instance = new this(data);
            this.manager.set(data.id, instance);
        })
    }

    static async create(options: DataCreateOptions<SkillOptions>) {
        const duplicate = await this.collection.findOne({guildId: options.guildId, name: options.name});
        if (duplicate) throw `该技能名字已被占用`;
        const snowflake = this.snowflake.generate(true);
        const data: SkillDB = {
            ...options,
            id: snowflake.id,
            timestamp: snowflake.timestamp
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw '该技能不存在';
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    async delete() {
        Skill.manager.delete(this.id);
        await Skill.collection.deleteOne({id: this.id});
    }
    
    async addChannel(channelIdList: string[]) {
        const filtered = channelIdList.filter(id => !this.channelIdList.includes(id) && this.guild.channels.cache.has(id))
        await Skill.collection.updateOne({id: this.id}, {$push: {channelIdList: {$each: filtered}}});
        this.channelIdList.push(...filtered)
        return filtered;
    }

    async removeChannel(channelIdList: string[]) {
        const filtered = channelIdList.filter(id => this.channelIdList.includes(id))
        await Skill.collection.updateOne({id: this.id}, {$pull: {channelIdList: {$in: filtered}}});
        filtered.forEach(id => this.channelIdList.splice(this.channelIdList.indexOf(id), 1));
        return filtered;
    }

    async rename(name: string) {
        await Skill.collection.updateOne({id: this.id}, {$set: {name}});
        this.name = name;
    }

    async editIntro(intro: string) {
        await Skill.collection.updateOne({id: this.id}, {$set: {intro}});
        this.intro = intro;
    }

    async editThreshold(threshold: number) {
        await Skill.collection.updateOne({id: this.id}, {$set: {threshold}})
        this.threshold = threshold;
    }

    async detailFromUser(userId: string) {
        const cursor = $Message.collection.aggregate([
            {$match: {
                $or: [
                    {channelId: {$in: this.channelIdList}},
                    {parentChannelId: {$in: this.channelIdList}, parentChannelType: ChannelType.GuildForum}
                ],
                $and: [{
                    $or: [
                        {authorId: userId},
                        {bot: true, "interaction.userId": userId}
                    ]
                }]
            }},
            {$group: {
                _id: null,
                count: { $sum: 1}
            }}
        ])
        const messages = await cursor.toArray();
        cursor.close();
        const exp = messages[0] ? messages[0].count : 0;
        return this.calcDetail(exp);
    }

    calcDetail(exp: number) {
        let currentExp = exp;
        let threshold_lvl = this.threshold;
        let level = 0;
        while (currentExp > threshold_lvl) {
            level++;
            currentExp -= threshold_lvl;
            threshold_lvl *= 2;
        }
        return {exp, level, currentExp, threshold_lvl}
    }

    async rankingList(limit: number) {
        const cursor = $Message.collection.aggregate([
            {$match: {
                $or: [
                    {channelId: {$in: this.channelIdList}},
                    {parentChannelId: {$in: this.channelIdList}, parentChannelType: ChannelType.GuildForum}
                ]
            }}
        ])
        const messageList = await cursor.toArray();
        cursor.close();
        const mostSkilledUserDataList = countArrayItem(messageList.map(data => data.authorId)).sort((a, b) => b.count - a.count).slice(0, limit);
        return mostSkilledUserDataList.map(data => ({
            $member: $Member.getFromMember(this.guildId, data.value),
            ...this.calcDetail(data.count)
        }));
    }

    infoEmbed() {
        return new Embed()
            .description(this.intro)
            .title(this.name)
            .field(`Channels`, this.channelIdList.map(id => `<#${id}>`).toString().replaceAll(',', ' '))
            .footer(`Skill Info`)
    }

    static guildSkills(guildId: string) {
        return [...Skill.manager.values()].filter(skill => skill.guildId === guildId);
    }

    static async rankingEmbed(guildId: string) {
        const guild = $Guild.get(guildId).guild;
        const skills = this.guildSkills(guildId);
        const $skillRankedList = await Promise.all(skills.map(async skill => {
            return {
                skill: skill,
                $memberDetails: await skill.rankingList(3)
            }
        }))
        return new Embed()
            .description($.Text([
                $skillRankedList.map(rank => {
                    return [
                        $.H3(rank.skill.name),
                        rank.$memberDetails.map(detail => $.Blockquote(`${detail.$member} LV${detail.level}`))
                    ]
                })
            ]))
            .color('Yellow')
            .footer(`${guild.name} | Skill Ranking`, guild.iconURL())
            .max()
    }
}

addClientListener('channelDelete', async channel => {
    if (channel.isDMBased()) return;
    Skill.manager.forEach(skill => {
        if (skill.channelIdList.includes(channel.id)) skill.removeChannel([channel.id]);
    })
})

addClientListener('threadDelete', async thread => {
    Skill.manager.forEach(skill => {
        if (skill.channelIdList.includes(thread.id)) skill.removeChannel([thread.id]);
        if (thread.parentId && skill.channelIdList.includes(thread.parentId)) skill.removeChannel([thread.parentId]);
    })
})