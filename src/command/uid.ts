import { Command } from "../module/Bot/Command";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Modal } from "../module/Bot/Modal";
import { Reply } from "../module/Bot/Reply";
import { addInteractionListener } from "../module/Util/listener";
import { Game } from "../structure/Game";
import { GameUid } from "../structure/GameUID";
import { gameSelector } from "./sys/game";

export const cmd_uid = new Command('uid', '游戏账号设定')
.subCommand('set', '设定游戏名片', subcmd => {
    gameSelector(subcmd)
    .execute(async (i, options) => {
        const game = await Game.fetch(options.game);
        const uid = await GameUid.fetch(i.user.id, game.id);
        i.showModal(
            new Modal(`玩家资料：${game.name}`, `uid-set@${game.id}`)
            .short('玩家名称', 'name', {required: true, value: uid?.name})
            .short('玩家 ID', 'id', {required: true, value: uid?.playerId})
            .paragraph('玩家简介', 'intro', {required: false, value: uid?.intro})
            .short('名片缩图', 'thumbnail', {required: false, value: uid?.thumbnail_url})
            .data)
    })
})

.subCommand('delete', '删除你的游戏名片', subcmd => {
    uidSelector(subcmd)
    .execute(async (i, options) => {
        const uid = await GameUid.fetch(i.user.id, options.game);
        if (!uid) throw `你尚未创建该游戏名片`
        await uid.delete();
        return new Reply(`你已删除 **${uid.game.name}** 的游戏名片`)
    })
})

.subCommand('send', '发送你的游戏名片', subcmd => {
    uidSelector(subcmd)
    .execute(async (i, options) => {
        const uid = await GameUid.fetch(i.user.id, options.game);
        if (!uid) throw '该游戏名片不存在';
        return new MessageBuilder().embed(uid.cardEmbed())
    })
})

.subCommand('view', '查查看你的游戏名片', subcmd => {
    uidSelector(subcmd)
    .execute(async (i, options) => {
        const uid = await GameUid.fetch(i.user.id, options.game);
        if (!uid) throw '该游戏名片不存在';
        return new MessageBuilder().embed(uid.cardEmbed()).ephemeral(true)
    })
})

addInteractionListener('uid-set', async i => {
    if (i.isModalSubmit() === false) return;
    const gameId = i.customId.split('@')[1];
    const game = await Game.fetch(gameId);
    const uid = await GameUid.fetch(i.user.id, game.id);
    const data = {
        name: i.fields.getTextInputValue('name'),
        intro: i.fields.getTextInputValue('intro'),
        thumbnail_url: i.fields.getTextInputValue('thumbnail'),
        playerId: i.fields.getTextInputValue('id')
    }
    if (uid) {
        await uid.edit(data)
        return new Reply(`游戏名片修改完成`).embed(uid.cardEmbed())
    } else {
        const uid = await GameUid.create({
            ...data,
            thumbnail_url: data.thumbnail_url.length ? data.thumbnail_url : undefined,
            gameId: game.id,
            userId: i.user.id,
        })
        return new Reply(`游戏名片创建完成`).embed(uid.cardEmbed())
    }
})
export function uidSelector(subcmd: ExecutableCommand) {
    return subcmd
        .string('game', '游戏名字', {required: true,
            autocomplete: async (focused, options, i) => {
                const uidList = await GameUid.fetchListFromUser(i.user.id);
                const matches = uidList.map(uid => uid.game).filter(game => game.name.toLowerCase().includes(focused.value.toLowerCase()) || game.alias_name.find(alias => alias.toLowerCase().includes(focused.value.toLowerCase())));
                return matches.map(game => ({
                    name: game.name,
                    value: game.id
                }))
            }
        })
}