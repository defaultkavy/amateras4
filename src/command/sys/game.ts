import { ExecutableCommand } from "../../module/Bot/ExecutableCommand";
import { Modal } from "../../module/Bot/Modal";
import { Reply } from "../../module/Bot/Reply";
import { addInteractionListener, codeBlock } from "../../module/Util/util";
import { Game } from "../../structure/Game";
import { cmd_sys } from "./sys";

export function sys_game() {
    cmd_sys
    .subGroup('game', 'Game Settings', group => {
        group
        .subCommand('add', 'Add game', subcmd => {
            subcmd
            .string('name', 'Game name', {required: true})
            .string('icon', 'Game icon URL', {required: true})
            .string('alias', 'Game alias name, use semicolon to separate names', {required: false})
            .execute(async (i, options) => {
                const aliasNameList = options.alias?.split(/[;；]/).map(label => label.trim()).filter(label => label.length);
                const game = await Game.create({
                    name: options.name,
                    icon_url: options.icon,
                    alias_name: aliasNameList ?? []
                })
                return new Reply(`游戏已创建：${game.name}`)
            })
        })
        .subCommand('delete', 'Delete game', subcmd => {
            gameSelector(subcmd)
            .execute(async (i, options) => {
                const game = await Game.fetch(options.game);
                await game.delete();
                return new Reply(`游戏已移除：${game.name}`)
            })
        })

        .subCommand('edit', 'Edit game profile', subcmd => {
            gameSelector(subcmd)
            .execute(async (i, options) => {
                const game = await Game.fetch(options.game);
                i.showModal(
                    new Modal('Edit Game Profile', `sys-game-edit@${game.id}`)
                    .short('Name', 'name', {required: true, value: game.name})
                    .paragraph('Alias Names', 'alias', {required: false, value: game.alias_name.toString().replaceAll(',', '; ')})
                    .data
                )
            })
        })
    })
}

export function gameSelector(subcmd: ExecutableCommand) {
    return subcmd
        .string('game', '游戏名字', {required: true,
            autocomplete: async (focused, options, i) => {
                const matches = [...Game.manager.values()].filter(game => game.name.toLowerCase().includes(focused.value.toLowerCase()) || game.alias_name.find(alias => alias.toLowerCase().includes(focused.value.toLowerCase())));
                return matches.map(game => ({
                    name: game.name,
                    value: game.id
                }))
            }
        })
}

addInteractionListener('sys-game-edit', async i => {
    if (i.isModalSubmit() === false) return;
    const game = await Game.fetch(i.customId.split('@')[1]);
    const data = {
        name: i.fields.getTextInputValue('name'),
        alias_name: i.fields.getTextInputValue('alias').split(/[;；]/).map(label => label.trim()).filter(label => label.length)
    }
    await game.edit(data)
    return new Reply(`游戏资料已更改：${game.name}\n${codeBlock(game.alias_name.toString().replaceAll(',', '\n'))}`)
})