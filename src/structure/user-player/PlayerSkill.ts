import { InGuildData, InGuildDataOptions } from "../InGuildData";
import { db } from "../../method/db";
import { DataCreateOptions } from "../../module/DB/Data";
import { Snowflake } from "../../module/Snowflake";
import { config } from "../../../bot_config";
import { __EVENT_LISTENERS__, addListener } from "../../module/Util/util";
import { Skill } from "./Skill";
import { UserPlayer } from "./Player";

export interface PlayerSkillOptions extends InGuildDataOptions {
    skillId: string;
    playerId: string;
    userId: string;
    exp: number;
}
export interface PlayerSkillDB extends PlayerSkillOptions {}
export interface PlayerSkill extends PlayerSkillDB {}

export class PlayerSkill extends InGuildData {
    static collection = db.collection<PlayerSkillDB>('player-skill');
    static manager = new Map<string, PlayerSkill>();
    static snowflake = new Snowflake({epoch: config.epoch, workerId: 12});
    constructor(data: PlayerSkillDB) {
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

    static async create(options: DataCreateOptions<PlayerSkillOptions>) {
        const duplicate = await this.collection.findOne({playerId: options.playerId, skillId: options.skillId});
        if (duplicate) throw `玩家已拥有技能`;
        const snowflake = this.snowflake.generate(true);
        const data: PlayerSkillDB = {
            ...options,
            id: snowflake.id,
            timestamp: snowflake.timestamp
        }
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        await this.collection.insertOne(data);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw '该技能不存在';
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static async fetchListFromUser(guildId: string, userId: string) {
        const cursor = this.collection.find({guildId, userId})
        const dataList = await cursor.toArray();
        cursor.close();
        return dataList.map(data => {
            const instance = new this(data);
            this.manager.set(data.id, instance);
            return instance;
        })
    }

    static getFromPlayer(playerId: string) {
        return [...this.manager.values()].filter(skill => skill.playerId === playerId);
    }

    async delete() {
        PlayerSkill.manager.delete(this.id);
        await PlayerSkill.collection.deleteOne({id: this.id});
    }

    async expUp(exp: number) {
        await PlayerSkill.collection.updateOne({id: this.id}, {$inc: {exp}})
        this.exp += exp;
    }

    async expDown(exp: number) {
        await PlayerSkill.collection.updateOne({id: this.id}, {$inc: {exp: -exp}})
        this.exp -= exp;
    }

    get skill() {
        return Skill.manager.get(this.skillId) as Skill;
    }

    get level() {
        return this.exp === 0 ? 0 : 1 + Math.floor(this.exp / this.skill.threshold);
    }

    get currentExp() {
        return this.exp % this.skill.threshold;
    }
}
addListener('messageCreate', async message => {
    if (message.interaction) return;
    if (message.inGuild() === false) return;
    const channelId = message.channelId;
    if (!channelId) return;
    const skillList = [...Skill.manager.values()].filter(skill => skill.channelIdList.includes(channelId) || message.channel.isThread() ? message.channel.parentId : false);
    const player = await UserPlayer.fetchFromUser(message.guildId, message.author.id);
    skillList.forEach(skill => {
        const playerSkill = player.skills.find(pSkill => pSkill.skill === skill);
        if (!playerSkill) {
            PlayerSkill.create({
                clientId: message.client.user.id,
                exp: 1,
                guildId: message.guildId,
                playerId: player.id,
                skillId: skill.id,
                userId: message.author.id
            })
        } else {
            playerSkill.expUp(1);
        }
    })
    
})