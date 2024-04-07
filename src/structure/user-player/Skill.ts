import { InGuildData, InGuildDataOptions } from "../InGuildData";
import { db } from "../../method/db";
import { DataCreateOptions } from "../../module/DB/Data";
import { Snowflake } from "../../module/Snowflake";
import { config } from "../../../bot_config";
import { Embed } from "../../module/Bot/Embed";
import { addListener } from "../../module/Util/util";
import { GuildMessage } from "../GuildMessage";
import { ChannelType } from "discord.js";

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
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 10});
    constructor(data: SkillDB) {
        super(data);
    }

    static async init() {
        const cursor = this.collection.find()
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

    async detail(userId: string) {
        const cursor = GuildMessage.collection.aggregate([
            {$match: {
                $or: [
                    {channelId: {$in: this.channelIdList}},
                    {parentChannelId: {$in: this.channelIdList}, parentChannelType: ChannelType.GuildForum}
                ],
                $and: [{authorId: userId}]
            }},
            {$group: {
                _id: null,
                count: { $sum: 1}
            }}
        ])
        const messages = await cursor.toArray();
        cursor.close();
        const exp = messages[0] ? messages[0].count : 0;
        return {
            exp: exp,
            level: exp === 0 ? 0 : 1 + Math.floor(exp / this.threshold),
            currentExp: exp % this.threshold
        }
    }

    infoEmbed() {
        return new Embed()
            .description(this.intro)
            .title(this.name)
            .field(`Channels`, this.channelIdList.map(id => `<#${id}>`).toString().replaceAll(',', ' '))
            .footer(`Skill Info`)
    }
}

addListener('channelDelete', async channel => {
    if (channel.isDMBased()) return;
    Skill.manager.forEach(skill => {
        if (skill.channelIdList.includes(channel.id)) skill.removeChannel([channel.id]);
    })
})

addListener('threadDelete', async thread => {
    Skill.manager.forEach(skill => {
        if (skill.channelIdList.includes(thread.id)) skill.removeChannel([thread.id]);
        if (thread.parentId && skill.channelIdList.includes(thread.parentId)) skill.removeChannel([thread.parentId]);
    })
})