import { InGuildData, InGuildDataOptions } from "./InGuildData";
import { db } from "../method/db";
import { DataCreateOptions } from "../module/DB/Data";
import { Snowflake } from "../module/Snowflake";
import { config } from "../../bot_config";
import { BotClient } from "./BotClient";
import { Log } from "../module/Log/Log";
import { Embed } from "../module/Bot/Embed";
import { ButtonStyle, Guild, GuildMember, codeBlock } from "discord.js";
import { Skill } from "./Skill";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Reply } from "../module/Bot/Reply";
import { MessageActionRow } from "../module/Bot/ActionRow";
import { addInteractionListener, addClientListener } from "../module/Util/listener";
import { $Guild } from "./$Guild";
import { snowflakes } from "../method/snowflake";
import { GameUid } from "./GameUID";
import { $ } from "../module/Util/text";

export interface $MemberOptions extends InGuildDataOptions {
    intro: string;
    userId: string;
}
export interface $MemberDB extends $MemberOptions {}
export interface $Member extends $MemberDB {}

export class $Member extends InGuildData {
    static collection = db.collection<$MemberDB>('member');
    static manager = new Map<string, $Member>();
    static snowflake = snowflakes.$member;
    constructor(data: $MemberDB) {
        super(data);
    }

    static async init(guildId: string) {
        const guild = $Guild.get(guildId).guild;
        await Skill.init(guild);
        const cursor = this.collection.find({guildId: guild.id})
        const list = await cursor.toArray();
        cursor.close();
        list.forEach(data => {
            const instance = new this(data);
            this.manager.set(data.id, instance);
        })
        let [memberCreated] = [0]
        const guildPlayerUserIdList = [...this.manager.values()].filter(player => player.guildId === guild.id).map(player => player.userId)
        guild.members.cache.forEach(member => {
            if (guildPlayerUserIdList.includes(member.id) === false) {
                memberCreated += 1;
                this.create({
                    clientId: guild.client.user.id,
                    guildId: guild.id,
                    intro: '',
                    userId: member.id
                })
            }
        })
        new Log(`[${guild.name}] Player created: ${memberCreated}. Total: ${guild.members.cache.size}.`)
    }

    static async create(options: DataCreateOptions<$MemberOptions>) {
        const duplicate = await this.collection.findOne({id: options.userId, guildId: options.guildId});
        if (duplicate) throw `该玩家已存在`;
        const snowflake = this.snowflake.generate(true);
        const data: $MemberDB = {
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
        const data = await this.collection.findOne({id});
        if (!data) throw '该用户资料不存在';
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static async fetchFromMember(guildId: string, userId: string) {
        const data = await this.collection.findOne({guildId, userId});
        if (!data) throw '该用户资料不存在';
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static getFromMember(guildId: string, userId: string) {
        return Array.from(this.manager.values()).find($member => $member.guildId === guildId && $member.userId === userId) as $Member;
    }

    async delete() {
        $Member.manager.delete(this.id);
        await $Member.collection.deleteOne({id: this.id});
    }

    async editIntro(intro: string) {
        await $Member.collection.updateOne({id: this.id}, {$set: {intro}});
        this.intro = intro;
    }

    async cardEmbed() {
        // skills
        const skills = this.skills;
        const skillDetailList = await Promise.all(skills.map(async skill => ({...await skill.detailFromUser(this.userId), name: skill.name})))
        const skillFilteredList = skillDetailList.filter(skill => skill.level);
        // game
        const gameUidList = await GameUid.fetchListFromUser(this.userId);
        //
        const description = $.Text([
            $.Line(`${this.intro}`),
            // skillFilteredList.length 
            //     ? [
            //         $.Line($('bold')`技能等级`),
            //         skillFilteredList.sort((a, b) => b.level - a.level).slice(0, 3).map(pSkill => $.Blockquote(`${pSkill.name} LV${pSkill.level}`))
            //     ]
            //     : null,
            // gameUidList.length
            //     ? [
            //         $.Line($('bold')`玩过的游戏`),
            //         gameUidList.map(uid => $.Blockquote(uid.game.name))
            //     ]
            //     : null,
        ]).trim();
        const embed = new Embed()
            .author(this.member.displayName)
            .description(description.length ? description : undefined)
            .color(this.member.roles.highest.color)
            .thumbnail(this.member.displayAvatarURL())
            .footer(`${this.guild.name} | User Card`, this.guild.iconURL() ?? undefined)
            .max()
        if (skillFilteredList.length) embed.field(
                $([`技能 `, $('bold')`(${ skillFilteredList.length })`]), 
                $(skillFilteredList.sort((a, b) => b.level - a.level).slice(0, 3).map(pSkill => $.Blockquote(`${pSkill.name} LV${pSkill.level}`))),
                true
            )
        if (gameUidList.length) embed.field(
                $([`游戏 `, $('bold')`(${gameUidList.length})`]), 
                $(gameUidList.slice(0, 3).map(uid => $.Blockquote(uid.game.name))),
                true
            )
        return embed
    }

    async cardMessage() {
        const builder = new MessageBuilder()
            .embed(await this.cardEmbed())
        const row = new MessageActionRow;
        if (this.skills.length) row.button('技能详情', `player-skill-detail@${this.id}`, {style: ButtonStyle.Primary})
        row.button('更新资讯', `player-skill-refresh@${this.id}`, {style: ButtonStyle.Secondary})
        builder.actionRow(row);
        return builder;
    }

    async skillEmbed() {
        const skillDetailList = await Promise.all(this.skills.map(async skill => ({...await skill.detailFromUser(this.userId), name: skill.name, threshold: skill.threshold})))
        const description = `${
            codeBlock(
                skillDetailList.sort((a, b) => b.level - a.level).map(pSkill => `${pSkill.name} LV${pSkill.level} EXP(${pSkill.currentExp}/${pSkill.threshold})`).toString().replaceAll(',', '\n')
            )
        }`
        return new Embed()
            .author(this.member.displayName)
            .color(this.member.roles.highest.color)
            .thumbnail(this.member.displayAvatarURL())
            .footer(`${this.guild.name} | User Skills`, this.guild.iconURL() ?? undefined)
            .description(description)
            .max()
    }

    get member() {
        return this.guild.members.cache.get(this.userId) as GuildMember;
    }

    get skills() {
        return [...Skill.manager.values()].filter(skill => skill.guildId === this.guildId);
    }

    toString() {
        return this.member.toString();
    }
}

addInteractionListener('player-skill-detail', async i => {
    const $member = await $Member.fetch(i.customId.split('@')[1]);
    return new Reply().embed(await $member.skillEmbed())
})

addInteractionListener('player-skill-refresh', async i => {
    if (i.isButton() === false) return;
    const $member = await $Member.fetch(i.customId.split('@')[1]);
    i.update((await $member.cardMessage()).data)
})

addClientListener('guildMemberAdd', async member => {
    $Member.create({
        clientId: member.client.user.id,
        guildId: member.guild.id,
        intro: '',
        userId: member.id
    })
})