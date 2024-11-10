import { ButtonStyle } from "discord.js";
import { Command } from "../module/Bot/Command";
import { MessageBuilder } from "../module/Bot/MessageBuilder";

export const cmd_ttt = new Command('ttt', '开启游戏')
.execute(() => {
    return new MessageBuilder()
        .actionRow(row => row
            .button(undefined, 'test', {emoji: '✖️', style: ButtonStyle.Danger})
            .button(undefined, 'test2', {emoji: '✖️', style: ButtonStyle.Primary})
            .button(undefined, 'test3', {emoji: '✖️', style: ButtonStyle.Secondary})
        )
        .actionRow(row => row
            .button(undefined, 'test4', {emoji: '✖️', style: ButtonStyle.Success})
            .button(undefined, 'test5', {emoji: '✖️'})
            .button(undefined, 'test6', {emoji: '✖️'})
        )
        .actionRow(row => row
            .button(undefined, 'test7', {emoji: '✖️'})
            .button(undefined, 'test8', {emoji: '✖️'})
            .button(undefined, 'test9', {emoji: '✖️'})
        )
})