import { Command } from "../module/Bot/Command";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";
import { Modal } from "../module/Bot/Modal";
import { Reply } from "../module/Bot/Reply";
import { addInteractionListener } from "../module/Util/listener";
import { Skill } from "../structure/Skill";

export const cmd_skill = new Command('skill', '技能设定')
.subCommand('create', '创建技能', subcmd => {
    subcmd
    .string('name', '技能名字', {required: true})
    .string('channels', '增加技能经验的频道', {required: false})
    .number('threshold', '技能等级阈值（预设为10）', {required: false, minValue: 1})
    .executeInGuild(async (i, options) => {
        const channelIdList = options.channels ? channelIdExtract(options.channels) : []
        const skill = await Skill.create({
            name: options.name,
            channelIdList: channelIdList ?? [],
            threshold: options.threshold ?? 10,
            clientId: i.client.user.id,
            guildId: i.guildId,
            intro: ''
        })
        return new Reply(`技能 **${skill.name}** 已创建`)
    })
})

.subCommand('info', '技能详情', subcmd => {
    skillSelector(subcmd)
    .executeInGuild(async (i, options) => {
        const skill = await Skill.fetch(options.skill);
        return new Reply().embed(skill.infoEmbed())
    })
})

.subGroup('channels', '编辑技能经验频道', group => {
    group
    .subCommand('add', '增加频道', subcmd => {
        skillSelector(subcmd)
        .string('channels', '增加技能经验的频道', {required: true})
        .executeInGuild(async (i, options) => {
            const channelIdList = channelIdExtract(options.channels) ?? [];
            const skill = await Skill.fetch(options.skill);
            const addedChannelIdList = await skill.addChannel(channelIdList);
            return new Reply(`已添加${addedChannelIdList.length}个频道`).embed(skill.infoEmbed());
        })
    })
    .subCommand('remove', '移除频道', subcmd => {
        skillSelector(subcmd)
        .string('channels', '增加技能经验的频道', {required: true})
        .executeInGuild(async (i, options) => {
            const channelIdList = channelIdExtract(options.channels) ?? [];
            const skill = await Skill.fetch(options.skill);
            const removedChannelIdList = await skill.removeChannel(channelIdList);
            return new Reply(`已移除${removedChannelIdList.length}个频道`).embed(skill.infoEmbed());
        })
    })
})

.subCommand('rename', '重命名', subcmd => {
    skillSelector(subcmd)
    .string('name', '技能名字', {required: true})
    .executeInGuild(async (i, options) => {
        const skill = await Skill.fetch(options.skill);
        const oldName = skill.name;
        skill.rename(options.name);
        return new Reply(`重命名完成：${oldName} => ${skill.name}`)
    })
})

.subCommand('intro', '编辑技能介绍', subcmd => {
    skillSelector(subcmd)
    .executeInGuild(async (i, options) => {
        const skill = await Skill.fetch(options.skill);
        i.showModal(
            new Modal('Edit Skill Intro', `skill-intro@${skill.id}`)
            .paragraph('Intro', 'intro', {value: skill.intro, required: false})
            .data
        )
    })
})

.subCommand('threshold', '编辑阈值', subcmd => {
    skillSelector(subcmd)
    .number('threshold', '技能阈值', {required: true, minValue: 1})
    .executeInGuild(async (i, options) => {
        const skill = await Skill.fetch(options.skill);
        const oldValue = skill.threshold;
        await skill.editThreshold(options.threshold);
        return new Reply(`技能 **${skill.name}** 阈值已修改：${oldValue} => ${skill.threshold}`)
    })
})

addInteractionListener('skill-intro', async i => {
    if (i.isModalSubmit() === false) return;
    const skill = await Skill.fetch(i.customId.split('@')[1]);
    const intro = i.fields.getTextInputValue('intro');
    await skill.editIntro(intro);
    return new Reply(`技能 **${skill.name}** 简介修改完成`);
})

function channelIdExtract(str: string) {
    return str.match(/<#([0-9]+>)/g)?.map(channelString => channelString.replaceAll(/<#|>/g, ''))
}

export function skillSelector(subcmd: ExecutableCommand) {
    return subcmd
        .string('skill', '技能名字', {required: true,
            autocomplete: async (focused, options, i) => {
                const skillList = Array.from(Skill.manager.values()).filter(skill => skill.guildId === i.guildId);
                const matches = skillList.filter(skill => skill.name.toLowerCase().includes(focused.value.toLowerCase()));
                return matches.map(skill => ({
                    name: skill.name,
                    value: skill.id
                }))
            }
        })
}