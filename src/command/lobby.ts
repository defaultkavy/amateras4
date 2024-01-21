import { AutocompleteFocusedOption, AutocompleteInteraction } from "discord.js";
import { Command } from "../module/Bot/Command";
import { Reply } from "../module/Bot/Reply";
import { Lobby } from "../structure/Lobby";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";
import { getUserIdFromText } from "../module/Util/util";

export const cmd_lobby = new Command('lobby', '房间指令集')
.subCommand('open', '创建房间', subcmd => {
    subcmd
    .string('name', '房间名字', {required: true})
    .execute(async (i, options) => {
        await i.deferSlient();
        const lobby = await Lobby.create({
            guildId: i.guildId,
            name: options.name,
            ownerUserId: i.user.id
        })
        return new Reply(`房间已创建: ${lobby.name} > ${i.guild.channels.cache.get(lobby.infoChannelId)}`)
    })
})

.subCommand('close', '关闭房间', subcmd => {
    lobbySelect(subcmd)
    .execute(async (i, options) => {
        await i.deferSlient();
        const lobby = await Lobby.fetch(options.lobby);
        if (lobby.ownerUserId !== i.user.id) throw '你不是房主';
        await lobby.delete();
        return new Reply(`房间已关闭：${lobby.name}`)
    })
})

.subCommand('invite', '邀请用户', subcmd => {
    lobbySelect(subcmd)
    .string('users', '输入用户@名字', {required: true})
    .execute(async (i, options) => {
        const userId_list = getUserIdFromText(options.users)
        const lobby = await Lobby.fetch(options.lobby);
        if (lobby.ownerUserId !== i.user.id) throw '你不是房主';
        await Promise.all(userId_list.map(userId => lobby.join(userId)));
        let userMentionText = '';
        userId_list.forEach(userId => userMentionText += `<@${userId}> `);
        return new Reply(`已邀请用户加入房间【${lobby.name}】：${userMentionText}`)
    })
})

.subCommand('kick', '移除用户', subcmd => {
    lobbySelect(subcmd)
    .string('users', '输入用户@名字', {required: true})
    .execute(async (i, options) => {
        const userId_list = getUserIdFromText(options.users)
        const lobby = await Lobby.fetch(options.lobby);
        if (lobby.ownerUserId !== i.user.id) throw '你不是房主';
        await Promise.all(userId_list.map(userId => lobby.leave(userId, true)));
        let userMentionText = '';
        userId_list.forEach(userId => userMentionText += `<@${userId}> `);
        return new Reply(`已将该用户移出房间【${lobby.name}】：${userMentionText}`)
    })
})

.subCommand('leave', '离开房间', subcmd => {
    lobbySelect(subcmd)
    .string('users', '输入用户@名字', {required: true})
    .execute(async (i, options) => {
        const userId_list = getUserIdFromText(options.users)
        const lobby = await Lobby.fetch(options.lobby);
        if (lobby.ownerUserId !== i.user.id) throw '你不是房主';
        await Promise.all(userId_list.map(userId => lobby.leave(userId)));
        let userMentionText = '';
        userId_list.forEach(userId => userMentionText += `<@${userId}> `);
        return new Reply(`已将该用户请出房间【${lobby.name}】：${userMentionText}`)
    })
})

.subCommand('transfer', '移交房主权限', subcmd => {
    lobbySelect(subcmd)
    .user('user', '输入用户@名字', {required: true})
    .execute(async (i, options) => {
        const lobby = await Lobby.fetch(options.lobby);
        if (lobby.ownerUserId !== i.user.id) throw '你不是房主';
        if (!lobby.memberIdList.includes(options.user.id)) throw '对象不在房间内';
        await lobby.transferOwner(options.user.id);
        return new Reply(`房主权限移交至 ${options.user}`)
    })
})

.subCommand('rename', '重命名房间', subcmd => {
    lobbySelect(subcmd)
    .string('name', '房间名字', {required: true})
    .execute(async (i, options) => {
        const lobby = await Lobby.fetch(options.lobby);
        if (lobby.ownerUserId !== i.user.id) throw '你不是房主';
        await lobby.rename(options.name)
        return new Reply(`房间重命名：${lobby.name}`)
    })
})

.subGroup('channel', '频道设定', group => {
    group
    .subCommand('asset', '开启/关闭素材频道', subcmd => {
        lobbySelect(subcmd)
        .execute(async (i, options) => {
            const lobby = await Lobby.fetch(options.lobby);
            if (!lobby.assetChannelId) await lobby.setAssetChannel();
            else await lobby.removeAssetChannel();
            return new Reply(`素材频道已${lobby.assetChannelId ? '开启' : '关闭'}`)
        })
    })
})

function lobbySelect(subcmd: ExecutableCommand) {
    return subcmd
    .string('lobby', '选择房间', {required: true, 
        autocomplete: async (focused: AutocompleteFocusedOption, _: any, i: AutocompleteInteraction<'cached'>) => {
            const list = await Lobby.collection.find({ownerUserId: i.user.id, guildId: i.guildId}).toArray();
            const filtered = list.filter(lobby => lobby.name.toLowerCase().includes(focused.value.toLowerCase()));
            return filtered.map(lobby => ({
                name: lobby.name,
                value: lobby.id
            }))
        }
    })
}