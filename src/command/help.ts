import { AnySelectMenuInteraction, ButtonInteraction, ButtonStyle, Interaction } from "discord.js";
import { textContent } from "../method/embed";
import { MessageActionRow } from "../module/Bot/ActionRow";
import { Command } from "../module/Bot/Command";
import { addInteractionListener } from "../module/Util/util";
const cmd_data_list = [
    {label: '关于天照系统', value: 'intro', emoji: '⚙️'},
    {label: '如何设定欢迎讯息', value: 'welcome', emoji: '👋'},
    {label: '如何设定个人资料和发送名片', value: 'user', emoji: '🪪'},
    {label: '如何设定技能', value: 'skill', emoji: '📖'},
    {label: '如何设定游戏名片', value: 'uid', emoji: '🎮'},
    {label: '如何创建投票问卷', value: 'poll', emoji: '🎫'},
    {label: '如何创建个人房间', value: 'lobby', emoji: '🏠'},
    {label: '如何创建系统贴文', value: 'post', emoji: '✉️'},
    {label: '如何设定我的V身份', value: 'vid', emoji: '✨'},
    {label: '如何自定义机器人', value: 'bot', emoji: '🤖'},
]
const help_row = new MessageActionRow().stringSelect('help_cmd_select', cmd_data_list, {placeholder: '选择你需要了解的功能'})

export const cmd_help = new Command('help', '天照系统指南')
.string('cmd', '输入指令名', {required: false, 
    choices: cmd_data_list.map(data => ({
        name: data.value,
        value: data.value
    })),
})
.execute(async (i, options) => {
    if (options.cmd) return helpContent(options.cmd);
    return textContent('./help/help.md', [help_row]);
})

addInteractionListener('help_cmd_select', async i => {
    if (!i.isStringSelectMenu()) return;
    helpContent(i.values[0], i)
})

function helpContent(value: string, i?: ButtonInteraction | AnySelectMenuInteraction) {
    switch (value) {
        case 'intro': 
        case 'welcome': 
        case 'vid': 
        case 'post': 
        case 'uid': 
        case 'user':
        case 'skill':
            return textContent(`./help/${value}.md`, [help_row], i)
        case 'lobby': 
        return textContent('./help/lobby.md', [
                help_row,
                new MessageActionRow().button('房间进阶指南', 'help_lobby_advanced', {style: ButtonStyle.Primary})
            ], i)
        case 'poll': 
        return textContent('./help/poll.md', [
                help_row,
                new MessageActionRow().button('投票进阶指南', 'help_poll_advanced', {style: ButtonStyle.Primary})
            ], i)
        case 'bot': 
        return textContent('./help/bot_p1.md', [
                help_row,
                new MessageActionRow().button('下一页', 'help_bot_p2', {style: ButtonStyle.Primary})
            ], i)
    }
    throw '相关指令的指南不存在'
}

addInteractionListener('help_poll_advanced', async i => {
    if (!i.isButton()) return;
    textContent('./help/poll_advanced.md', [
        help_row,
    ], i);
})

addInteractionListener('help_lobby_advanced', async i => {
    if (!i.isButton()) return;
    textContent('./help/lobby_advanced.md', [
        help_row,
    ], i);
})

addInteractionListener('help_bot_p2', async i => {
    if (!i.isButton()) return;
    textContent('./help/bot_p2.md', [
        help_row,
        new MessageActionRow().button('上一页', 'help_bot_p1', {style: ButtonStyle.Primary})
    ], i);
})

addInteractionListener('help_bot_p1', async i => {
    if (!i.isButton()) return;
    textContent('./help/bot_p1.md', [
        help_row,
        new MessageActionRow().button('下一页', 'help_bot_p2', {style: ButtonStyle.Primary})
    ], i);
})