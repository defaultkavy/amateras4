import { InGuildData, InGuildDataOptions } from "../InGuildData";
import { db } from "../../method/db";
import { DataCreateOptions } from "../../module/DB/Data";
import { Snowflake } from "../../module/Snowflake";
import { config } from "../../../bot_config";
import { BotClient } from "../BotClient";
import { Log } from "../../module/Log/Log";
import { addInteractionListener, addListener, codeBlock } from "../../module/Util/util";
import { Embed } from "../../module/Bot/Embed";
import { ButtonStyle, GuildMember } from "discord.js";
import { PlayerSkill } from "./PlayerSkill";
import { Skill } from "./Skill";
import { MessageBuilder } from "../../module/Bot/MessageBuilder";
import { Reply } from "../../module/Bot/Reply";
import { MessageActionRow } from "../../module/Bot/ActionRow";

export interface UserPlayerOptions extends InGuildDataOptions {
    intro: string;
    userId: string;
}
export interface UserPlayerDB extends UserPlayerOptions {}
export interface UserPlayer extends UserPlayerDB {}

export class UserPlayer extends InGuildData {
    static collection = db.collection<UserPlayerDB>('player');
    static manager = new Map<string, UserPlayer>();
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 11});
    constructor(data: UserPlayerDB) {
        super(data);
    }

    static async init() {
        await Skill.init();
        await PlayerSkill.init();
        const cursor = this.collection.find()
        const list = await cursor.toArray()
        cursor.close();
        list.forEach(data => {
            const instance = new this(data);
            this.manager.set(data.id, instance);
        })
        new Log('User Player Initializing...')
        const InitializedGuildList: string[] = [];
        BotClient.manager.forEach(bot => {
            bot.client.guilds.cache.forEach(guild => {
                if (InitializedGuildList.includes(guild.id)) return;
                let [playerCreated] = [0]
                const guildPlayerUserIdList = [...this.manager.values()].filter(player => player.guildId === guild.id).map(player => player.userId)
                guild.members.cache.forEach(member => {
                    if (guildPlayerUserIdList.includes(member.id) === false) {
                        playerCreated += 1;
                        this.create({
                            clientId: bot.id,
                            guildId: guild.id,
                            intro: '',
                            userId: member.id
                        })
                    }
                })
                new Log(`[${guild.name}] Player created: ${playerCreated}. Total: ${guild.members.cache.size}.`)
                InitializedGuildList.push(guild.id)
            })
        })
    }

    static async create(options: DataCreateOptions<UserPlayerOptions>) {
        const duplicate = await this.collection.findOne({id: options.userId, guildId: options.guildId});
        if (duplicate) throw `该玩家已存在`;
        const snowflake = this.snowflake.generate(true);
        const data: UserPlayerDB = {
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

    static async fetchFromUser(guildId: string, userId: string) {
        const data = await this.collection.findOne({guildId, userId});
        if (!data) throw '该用户资料不存在';
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    async delete() {
        UserPlayer.manager.delete(this.id);
        await UserPlayer.collection.deleteOne({id: this.id});
    }

    async editIntro(intro: string) {
        await UserPlayer.collection.updateOne({id: this.id}, {$set: {intro}});
        this.intro = intro;
    }

    cardEmbed() {
        const description = `${this.intro}\n${this.skills.length ? codeBlock(`${
                this.skills.sort((a, b) => b.level - a.level).slice(0, 2).map(pSkill => `${
                    pSkill.skill.name} LV${pSkill.level}`).toString().replaceAll(',', ' | ')
            }`) : ''
        }`.trim();
        return new Embed()
            .author(this.member.displayName)
            .description(description.length ? description : undefined)
            .color(this.member.roles.highest.color)
            .thumbnail(this.member.displayAvatarURL())
            .footer(`${this.guild.name} | User Card`, this.guild.iconURL() ?? undefined)
            .max()
    }

    cardMessage() {
        const builder = new MessageBuilder()
            .embed(this.cardEmbed())
        const row = new MessageActionRow;
        if (this.skills.length) row.button('技能详情', `player-skill-detail@${this.id}`, {style: ButtonStyle.Primary})
        row.button('更新资讯', `player-skill-refresh@${this.id}`, {style: ButtonStyle.Secondary})
        builder.actionRow(row);
        return builder;
    }

    skillEmbed() {
        const description = `${
            codeBlock(
                this.skills.sort((a, b) => b.level - a.level).map(pSkill => `${pSkill.skill.name} LV${pSkill.level} EXP(${pSkill.currentExp}/${pSkill.skill.threshold})`).toString().replaceAll(',', '\n')
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
        return PlayerSkill.getFromPlayer(this.id);
    }
}

addListener('guildMemberAdd', async member => {
    UserPlayer.create({
        clientId: member.client.user.id,
        guildId: member.guild.id,
        intro: '',
        userId: member.id
    })
})

addInteractionListener('player-skill-detail', async i => {
    const player = await UserPlayer.fetch(i.customId.split('@')[1]);
    return new Reply().embed(player.skillEmbed())
})

addInteractionListener('player-skill-refresh', async i => {
    if (i.isButton() === false) return;
    const player = await UserPlayer.fetch(i.customId.split('@')[1]);
    i.update(player.cardMessage().data)
})