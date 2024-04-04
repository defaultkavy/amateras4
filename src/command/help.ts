import { ButtonStyle } from "discord.js";
import { textContent } from "../method/embed";
import { MessageActionRow } from "../module/Bot/ActionRow";
import { Command } from "../module/Bot/Command";
import { addInteractionListener } from "../module/Util/util";

const help_row = new MessageActionRow().stringSelect('help_cmd_select', [
    {label: '关于天照系统', value: 'help_select_intro'},
    {label: '如何设定欢迎讯息', value: 'help_select_welcome'},
    {label: '如何创建个人房间', value: 'help_select_lobby'},
    {label: '如何创建投票问卷', value: 'help_select_poll'},
    {label: '如何自定义机器人', value: 'help_select_bot'},
    {label: '如何创建系统贴文', value: 'help_select_post'},
    {label: '如何设定我的V身份', value: 'help_select_vid'},
], {placeholder: '选择你需要了解的功能'})

export const cmd_help = new Command('help', '天照系统指南')
.execute(async i => {
    return textContent('./help/help.md', [help_row])
})

addInteractionListener('help_cmd_select', async i => {
    if (!i.isStringSelectMenu()) return;
    switch (i.values[0]) {
        case 'help_select_intro': 
            textContent('./help/help.md', [help_row], i)
            break;
        case 'help_select_welcome': 
            textContent('./help/welcome.md', [help_row], i)
            break;
        case 'help_select_lobby': 
            textContent('./help/lobby.md', [
                help_row,
                new MessageActionRow().button('房间进阶指南', 'help_lobby_advanced', {style: ButtonStyle.Primary})
            ], i)
            break;
        case 'help_select_poll': 
            textContent('./help/poll.md', [
                help_row,
                new MessageActionRow().button('投票进阶指南', 'help_poll_advanced', {style: ButtonStyle.Primary})
            ], i)
            break;
        case 'help_select_bot': 
            textContent('./help/bot_p1.md', [
                help_row,
                new MessageActionRow().button('下一页', 'help_bot_p2', {style: ButtonStyle.Primary})
            ], i)
            break;
        case 'help_select_vid': 
            textContent('./help/vid.md', [help_row], i)
            break;
        case 'help_select_post': 
            textContent('./help/post.md', [help_row], i)
            break;
    }
})

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