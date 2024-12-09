import { PermissionsBitField } from "discord.js";
import { Command } from "../module/Bot/Command";
import { AutoRole, AutoRoleEvent, AutoRoleEventNameList, AutoRoleTarget } from "../structure/AutoRole";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Reply } from "../module/Bot/Reply";
import { CompletionTriggerKind } from "typescript";
import { addInteractionListener } from "../module/Util/listener";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";

export const cmd_role = new Command('role', '身分组设定')
.defaultMemberPermissions(PermissionsBitField.Flags.ManageRoles.toString())
.subGroup('set', '添加自动设定身分组', group => {
    group
    .subCommand('member-join', '当成员加入时，设置指定身分组', subcmd => {
        subcmd
        .role('role', '设定身分组', { required: true })
        .executeInGuild(async (i, options) => {
            await AutoRole.create({
                clientId: i.client.user.id,
                event: AutoRoleEvent.MEMBER_JOIN,
                guildId: i.guildId,
                roleId: options.role.id,
                targets: [AutoRoleTarget.SELF]
            })

            return new Reply('自动身分组已设定');
        })
    })
})

// .subGroup('unset', '移除身分组', group => {
    
// })

.subCommand('remove', '移除自动设定身分组', subcmd => {
    autoRoleSelector(subcmd)
    .executeInGuild(async (i, options) => {
        const autoRole = AutoRole.manager.get(options.record);
        if (!autoRole) throw '该记录不存在';
        await autoRole.delete();
        return '记录已删除'
    })
})

.subCommand('list', '查看已设定的身分组记录', subcmd => {
    subcmd
    .string('event', '选择事件', {
        choices: AutoRoleEventNameList.map((eventName, index) => ({
            name: eventName,
            value: `${index}`
        })
    )})
    .executeInGuild(async (i, options) => {
        const event = options.event ? +options.event : AutoRoleEvent.MEMBER_JOIN;
        const embed = AutoRole.listInfo(event, i.client.user.id, i.guildId);
        return new MessageBuilder()
            .embed(embed)
            .actionRow(row => row
                .stringSelect('role-list-event', AutoRoleEventNameList.map((eventName, index) => ({
                    label: eventName,
                    value: `${index}`,
                    default: event === index
                })))
            )
            .ephemeral(true)
    })
})

addInteractionListener('role-list-event', async i => {
    if (!i.isStringSelectMenu()) return;
    if (!i.inCachedGuild()) return;
    const eventIndex = i.values.at(0);
    if (!eventIndex) return;
    const embed = AutoRole.listInfo(+eventIndex, i.client.user.id, i.guildId);
    i.update(
        new MessageBuilder()
            .embed(embed)
            .actionRow(row => row
                .stringSelect('role-list-event', AutoRoleEventNameList.map((eventName, index) => ({
                    label: eventName,
                    value: `${index}`,
                    default: index === +eventIndex
                })))
            )
            .ephemeral(true)
            .data
    )
})

export function autoRoleSelector(subcmd: ExecutableCommand) {
    return subcmd
        .string('event', '选择事件', {
            required: true,
            choices: AutoRoleEventNameList.map((eventName, index) => ({
                name: eventName,
                value: `${index}`
            })
        )})
        .string('record', '选择设定记录', {required: true,
            autocomplete: async (focused, options, i) => {
                const event = i.options.data[0].options?.find(command => command.name === 'event')?.value;
                if (!event) return [];
                const autoRoleRecords = AutoRole.listFromEvent(+event, i.client.user.id, i.guildId);
                const matches = autoRoleRecords.filter(autoRole => autoRole.name.toLowerCase().includes(focused.value.toLowerCase()));
                return matches.map(autoRole => ({
                    name: autoRole.name,
                    value: autoRole.id
                }))
            }
        })
}