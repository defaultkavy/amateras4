import { db } from "../method/db";
import { snowflakes } from "../method/snowflake";
import { Embed } from "../module/Bot/Embed";
import { DataCreateOptions } from "../module/DB/Data";
import { addClientListener, addInteractionListener, addListener } from "../module/Util/listener";
import { $ } from "../module/Util/text";
import { InGuildData, InGuildDataOptions } from "./InGuildData";

export interface AutoRoleOptions extends InGuildDataOptions {
    roleId: string;
    event: AutoRoleEvent;
    targets: AutoRoleTarget[];
}
export interface AutoRoleDB extends AutoRoleOptions {}
export interface AutoRole extends AutoRoleDB {}

export class AutoRole extends InGuildData {
    static collection = db.collection<AutoRoleDB>('auto-role');
    static snowflake = snowflakes.auto_role;
    static manager = new Map<string, AutoRole>();
    constructor(data: AutoRoleDB) {
        super(data);
    }

    static async create(options: DataCreateOptions<AutoRoleOptions>) {
        const duplicate = await this.collection.find({roleId: options.roleId, targets: options.targets, clientId: options.clientId, event: options.event}).toArray();
        if (duplicate.length) throw '相同的自动身分组设定已存在';
        const snowflake = this.snowflake.generate(true);
        const data: AutoRoleDB = {
            ...options,
            ...snowflake
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static async init(clientId: string) {
        const cursor = this.collection.find({clientId: clientId});
        const list = await cursor.toArray();
        cursor.close();
        list.forEach(data => {
            const instance = new this(data);
            this.manager.set(instance.id, instance);
        })
    }

    static listFromEvent(event: AutoRoleEvent, clientId: string, guildId: string) { return Array.from(this.manager.values()).filter(autoRole => autoRole.event === event && autoRole.clientId === clientId && guildId === guildId) }

    static listInfo(event: AutoRoleEvent, clientId: string, guildId: string) {
        const list = this.listFromEvent(event, clientId, guildId);
        const content = $(list.map(autoRole => $.UList([
            $.Line(`设定目标：${autoRole.targets.map(target => target === 0 ? '主要对象' : '目标对象')}`),
            $.Line(`设定身分组：<@&${autoRole.roleId}>`)
        ])))
        const embed = new Embed()
            .title(`触发事件：${AutoRoleEventNameList[event]}`)
            .description(content)
        return embed;
    }

    async delete() {
        await AutoRole.collection.deleteOne({id: this.id});
        AutoRole.manager.delete(this.id);
    }

    get name() {
        const role = this.guild.roles.cache.get(this.roleId)
        return `${AutoRoleEventNameList[this.event]} => ${role ? `@${role.name}` : '@Unknown'}`
    }
}

export enum AutoRoleEvent {
    MEMBER_JOIN
}

export enum AutoRoleTarget {
    SELF,
    TARGET
}

export const AutoRoleEventNameList = ['新成员加入']

addClientListener('guildMemberAdd', async member => {
    const list = AutoRole.listFromEvent(AutoRoleEvent.MEMBER_JOIN, member.client.user.id, member.guild.id);
    if (!list.length) return;
    for (const autoRole of list) {
        member.roles.add(autoRole.roleId).catch(err => undefined);
    }
})