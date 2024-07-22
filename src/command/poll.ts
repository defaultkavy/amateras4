import { ChatInputCommandInteraction } from "discord.js";
import { Command } from "../module/Bot/Command";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";
import { Reply } from "../module/Bot/Reply";
import { codeBlock, substringWith } from "../module/Util/util";
import { Poll } from "../structure/Poll";

export const cmd_poll = new Command('poll', '投票指令')
.subCommand('create', '建立投票', subcmd => {
    subcmd
    .string('title', '投票标题', {required: true, maxLength: 100})
    .string('options', '选项内容（使用中英文分号 ; 可添加复数个选项内容）', {required: false})
    .integer('min', '最小需选项', {required: false, maxValue: 25, minValue: 1})
    .integer('max', '最大可选项', {required: false, maxValue: 25, minValue: 1})
    .boolean('send', '是否发送到频道', {required: false})
    .executeInGuild(async (i, options) => {
        if (!options.send) await i.deferSlient();
        const poll = await Poll.create({
            ownerUserId: i.user.id,
            title: options.title,
            maxVotes: options.max,
            minVotes: options.min
        })
        if (options.options) {
            const labelList = options.options.split(/[;；]/).map(label => label.trim()).filter(label => label.length);
            const OPTION_OVERSIZE = poll.options.length + labelList.length > 25;
            if (OPTION_OVERSIZE) throw '超出选项上限，最多只能存在25个选项';
            await poll.setOption(labelList.map(label => ({label: label})));
        }
        if (!options.send) return poll.panelMessage().ephemeral(true);
        else poll.sendPollMessage(i);
    })
})

.subGroup('option', '投票选项指令', group => {
    group
    .subCommand('add', '添加选项', subcmd => {
        pollSelector(subcmd)
        .string('label', '选项内容（使用中英文分号 ; 可添加复数个选项内容）', {required: true})
        .executeInGuild(async (i, options) => {
            await i.deferSlient();
            const poll = await pollOwnerFetch(i, options.poll)
            const labelList = options.label.split(/[;；]/).map(label => label.trim()).filter(label => label.length);
            const OPTION_OVERSIZE = poll.options.length + labelList.length > 25;
            if (OPTION_OVERSIZE) throw '超出选项上限，最多只能存在25个选项'
            await poll.setOption(labelList.map(label => ({label: label})))
            return new Reply(`已添加 ${labelList.length} 个选项`)
        })
    })

    .subCommand('remove', '移除选项', subcmd => {
        pollOptionSelector(pollSelector(subcmd))
        .executeInGuild(async (i, options) => {
            const poll = await pollOwnerFetch(i, options.poll)
            await poll.removeOption(options.option);
            return new Reply(`选项已移除`)
        })
    })

    .subCommand('edit', '修改选项内容', subcmd => {
        pollOptionSelector(pollSelector(subcmd))
        .string('label', '内容', {required: true})
        .executeInGuild(async (i, options) => {
            const poll = await pollOwnerFetch(i, options.poll)
            await poll.editOption(options.option, options.label);
            return new Reply(`选项内容已更改`)
        })

    })

    .subCommand('min', '最小选择数量（预设为1）', subcmd => {
        pollSelector(subcmd, false)
        .integer('value', '最小值', {required: true, maxValue: 25, minValue: 1})
        .executeInGuild(async (i, options) => {
            const poll = await pollOwnerFetch(i, options.poll);
            await poll.setMin(options.value);
            return new Reply(`已设定投票最小选项数量：${poll.minVotes}`)
        })
    })

    .subCommand('max', '最大选择数量（预设为1）', subcmd => {
        pollSelector(subcmd, false)
        .integer('value', '最大值', {required: true, maxValue: 25, minValue: 1})
        .executeInGuild(async (i, options) => {
            const poll = await pollOwnerFetch(i, options.poll);
            await poll.setMax(options.value);
            return new Reply(`已设定投票最大选项数量：${poll.maxVotes}`)
        })
    })
})

.subCommand('send', '发送投票讯息', subcmd => {
    pollSelector(subcmd)
    .executeInGuild(async (i, options) => {
        const poll = await pollOwnerFetch(i, options.poll)
        poll.sendPollMessage(i);
    })
})

.subCommand('title', '修改投票标题', subcmd => {
    pollSelector(subcmd)
    .string('title', '标题', {required: true, maxLength: 100})
    .executeInGuild(async (i, options) => {
        const poll = await pollOwnerFetch(i, options.poll)
        await poll.setTitle(options.title);
        return new Reply(`投票标题已更改：${poll.title}`)
    })
})

.subCommand('close', '结算投票', subcmd => {
    pollSelector(subcmd)
    .boolean('annouce', '是否发布结算讯息（预设为是）', {required: false})
    .executeInGuild(async (i, options) => {
        const poll = await pollOwnerFetch(i, options.poll)
        await poll.close(options.annouce)
        return new Reply(`投票已关闭：**${poll.title}**`)
    })
})

.subGroup('thumbnail', '缩图', group => {
    group
    .subCommand('set', '设定缩图', subcmd => {
        pollSelector(subcmd)
        .string('url', '缩图网址', {required: true})
        .executeInGuild(async (i, options) => {
            const poll = await pollOwnerFetch(i, options.poll);
            await poll.setThumbnail(options.url)
            return new Reply(`已设定投票缩图`);
        })
    })
    .subCommand('remove', '移除缩图', subcmd => {
        pollSelector(subcmd)
        .executeInGuild(async (i, options) => {
            const poll = await pollOwnerFetch(i, options.poll);
            await poll.removeThumbnail();
            return new Reply(`已移除投票缩图`);
        })
    })
})

.subCommand('start', '开始投票', subcmd => {
    pollSelector(subcmd, false)
    .executeInGuild(async (i, options) => {
        const poll = await pollOwnerFetch(i, options.poll);
        await poll.start();
        return new Reply(`投票已开启`);
    })
})

export function pollSelector(subcmd: ExecutableCommand, started: boolean | undefined = undefined, closed = false) {
    return subcmd.string('poll', '选择指定投票', {required: true,
        autocomplete: async (focused, _, i) => {
            const filter = started === undefined ? {} : {startTimestamp: {$exists: started}}
            const pollList = await Poll.collection.find({...filter, closed: closed, ownerUserId: i.user.id, title: {$regex: focused.value}}).toArray()
            return pollList.filter(poll => poll.title.toLowerCase().includes(focused.value.toLowerCase())).map(poll => ({
                name: `${poll.title.substring(0, 90)}${poll.title.length > 90 ? '...' : ''}`,
                value: poll.id
            }))
        }
    })
}

function pollOptionSelector(subcmd: ExecutableCommand & {_options: Record<'poll', string>}) {
    return subcmd.string('option', '选项', {required: true,
        autocomplete: async (focused, options, i) => {
            const pollId = options.getString('poll');
            const poll = await Poll.fetch(pollId);
            return poll.options.map(option => ({
                name: substringWith(option.label, 0, 90, '...'),
                value: option.id
            }))
        }
    })
}

async function pollOwnerFetch(i: ChatInputCommandInteraction<'cached'>, pollId: string) {
    const poll = await Poll.fetch(pollId);
    if (poll.ownerUserId !== i.user.id) throw '你不是投票创建者';
    return poll
}