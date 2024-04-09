import { Command } from "../module/Bot/Command";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";
import { Modal } from "../module/Bot/Modal";
import { Reply } from "../module/Bot/Reply";
import { addInteractionListener } from "../module/Util/listener";
import { $Guild } from "../structure/$Guild";
import { $Member } from "../structure/$Member";

export const cmd_me = new Command('user', '用户指令')
.subCommand('send', '发送你的名片', subcmd => {
    serverSelector(subcmd)
    .execute(async (i, options) => {
        const player = await $Member.fetchFromMember(options.server ?? i.guildId, i.user.id);
        return await player.cardMessage();
    })
})

.subCommand('view', '查看你的名片', subcmd => {
    serverSelector(subcmd)
    .execute(async (i, options) => {
        const player = await $Member.fetchFromMember(options.server ?? i.guildId, i.user.id)
        return (await player.cardMessage()).ephemeral(true);
    })
})

.subCommand('intro', '编辑你的简介', subcmd => {
    subcmd
    .execute(async (i, options) => {
        const player = await $Member.fetchFromMember(i.guildId, i.user.id);
        i.showModal(
            new Modal(`Edit User Intro`, `user-intro@${player.id}`)
            .paragraph('Intro', 'intro', {required: false, max_length: 100})
            .data
        )
    })
})

.subCommand('skill', '查看你的技能信息', subcmd => {
    subcmd
    .execute(async (i, options) => {
        const player = await $Member.fetchFromMember(i.guildId, i.user.id);
        return new Reply().embed(await player.skillEmbed())
    })
})

addInteractionListener('user-intro', async i => {
    if (i.isModalSubmit() === false) return;
    const player = await $Member.fetch(i.customId.split('@')[1]);
    await player.editIntro(i.fields.getTextInputValue('intro'));
    return new Reply().embed(await player.cardEmbed());
})


export function serverSelector(subcmd: ExecutableCommand) {
    return subcmd
    .string('server', '选择其它伺服器（只有天照系统 Bot 存在的伺服器可选）', {required: false,
        autocomplete: async (focused, options, i) => {
            const playerDataList = [...$Member.manager.values()].filter(data => data.userId === i.user.id);
            return playerDataList.filter(data => $Guild.manager.has(data.guildId) && $Guild.get(data.guildId).guild.name.toLowerCase().includes(focused.value.toLowerCase())).map(data => ({
                name: $Guild.get(data.guildId).guild.name,
                value: data.guildId
            }))
        }
    })
}