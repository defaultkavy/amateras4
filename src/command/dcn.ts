import { AutocompleteFocusedOption, AutocompleteInteraction, ChannelType, ChatInputCommandInteraction, PermissionFlagsBits, createChannel } from "discord.js";
import { Command } from "../module/Bot/Command";
import * as DCN from "../structure/dcn/_DCN";
import { Reply } from "../module/Bot/Reply";
import { OptionMap } from "../module/Bot/CommandManager";
import { BotClient } from "../structure/BotClient";
export const cmd_dcn = new Command('dcn', 'Discord 内容网络（Discord Content Network')
.subGroup('send', '发布设定', group => {
    group
    .subCommand('add', '增加频道/收藏集', subcmd => {
        subcmd
        .channel('channel', '选择频道', {channelTypes: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement], required: true})
        .string('collection', '频道内容将收录到收藏集（若名字不匹配现有的收藏集，将会创建新的收藏集）', {required: false,
            autocomplete: channel_collection_seletor
        })
        .execute(async (i, options) => {
            await i.deferSlient();
            const collection = options.collection 
                ? await DCN.Collection.fetch(options.collection).catch(err => undefined) 
                    ?? await DCN.Collection.fetchName(i.user.id, options.collection).catch(err => undefined) 
                    ?? await DCN.Collection.create({
                        name: options.collection,
                        userId: i.user.id
                    })
                : undefined;
            const send_channel = await DCN.SendChannel.fetch(options.channel.id, i.user.id).catch(err => undefined) ?? await DCN.SendChannel.create({
                channelId: options.channel.id,
                clientId: i.client.user.id,
                collectionIdList: collection ? [collection.id] : [],
                guildId: i.guildId,
                userId: i.user.id
            })
            if (collection && send_channel.collectionIdList.includes(collection.id) === false) await send_channel.addCollection(collection.id);
            return new Reply().embed(await send_channel.infoEmbed());
        })
    })
    .subCommand('remove', '移除频道/收藏集', subcmd => {
        subcmd
        .channel('channel', '选择频道', {channelTypes: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement], required: true})
        .string('collection', '从频道移除收藏集', {required: false,
            autocomplete: channel_collection_seletor
        })
        .execute(async (i, options) => {
            await i.deferSlient();
            const collection = options.collection 
                ? await DCN.Collection.fetch(options.collection).catch(err => undefined) 
                    ?? await DCN.Collection.fetchName(i.user.id, options.collection).catch(err => undefined) 
                : undefined;
            const send_channel = await DCN.SendChannel.fetch(i.channelId, i.user.id).catch(err => undefined)
            if (!send_channel) throw `频道${options.channel}并未设定为内容发送频道`;
            if (!options.collection) {
                await send_channel.delete()
                return new Reply(`已移除内容发送频道：${options.channel}`)
            }
            if (collection && send_channel.collectionIdList.includes(collection.id)) await send_channel.removeCollection(collection.id);
            return new Reply().embed(await send_channel.infoEmbed());
        })
    })
})
.subGroup('receive', '接收设定', group => {
    group
    .subCommand('add', '增加频道/列表', subcmd => {
        subcmd
        .channel('channel', '选择频道', {channelTypes: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement], required: true})
        .string('list', '该频道只显示被加入列表中的发布者内容（留空为预设列表）', {required: false,
            autocomplete: list_selector
        })
        .execute(async (i, options) => {
            await i.deferSlient();
            const user_permissions = i.channel?.permissionsFor(i.user)
            if (!user_permissions?.has(PermissionFlagsBits.ManageChannels)) throw `你没有管理该频道的权限`
            const list = options.list 
                ? await DCN.List.fetch(options.list).catch(err => undefined) 
                    ?? await DCN.List.fetchName(i.user.id, options.list).catch(err => undefined) 
                    ?? await DCN.List.create({
                        name: options.list,
                        userId: i.user.id,
                        default: false
                    })
                : await DCN.List.fetchDefault(i.user.id);
            const receive_channel = await DCN.ReceiveChannel.fetch(i.channelId, i.user.id).catch(err => undefined) ?? await DCN.ReceiveChannel.create({
                channelId: options.channel.id,
                clientId: i.client.user.id,
                guildId: i.guildId,
                userId: i.user.id,
                listIdList: [list.id],
            })
            if (list && receive_channel.listIdList.includes(list.id) === false) await receive_channel.addList(list.id);
            return new Reply().embed(await receive_channel.infoEmbed());
        })
    })
    .subCommand('remove', '移除频道/列表', subcmd => {
        subcmd
        .channel('channel', '选择频道', {channelTypes: [ChannelType.GuildText, ChannelType.GuildForum, ChannelType.GuildAnnouncement], required: true})
        .string('list', '从频道移除列表', {required: false,
            autocomplete: list_selector
        })
        .execute(async (i, options) => {
            await i.deferSlient();
            const list = options.list 
                ? await DCN.List.fetch(options.list).catch(err => undefined) 
                    ?? await DCN.List.fetchName(i.user.id, options.list).catch(err => undefined) 
                : undefined;
            const receive_channel = await DCN.ReceiveChannel.fetch(options.channel.id, i.user.id).catch(err => undefined)
            if (!receive_channel) throw `频道${options.channel}并未设定为内容接收频道`;
            if (!options.list) {
                await receive_channel.delete()
                return new Reply(`已移除内容接收频道：${options.channel}`)
            }
            if (list && receive_channel.listIdList.includes(list.id)) await receive_channel.removeList(list.id);
            return new Reply().embed(await receive_channel.infoEmbed());
        })
    })
})
.subCommand('follow', '关注用户', subcmd => {
    subcmd
    .string('user', '用户名', {required: true,
        autocomplete: async (focused, options, i) => {
            return Array.from(
                new Map( [...BotClient.manager.values()].map(bot => bot.client.users.cache.map(user => [user.id, user.username] as [string, string])).flat() )
            ).filter(data => data[1].toLowerCase().includes(focused.value.toLowerCase()))
            .sort((a, b) => {
                if (a[1].startsWith(focused.value)) return -1;
                else return 1
            })
            .sort((a, b) => a[1].length - b[1].length)
            .map(([id, username]) => ({
                name: username,
                value: id
            }))
        }
    })
    // .string('list', '选择要加入的列表（留空为预设列表）', {required: false,
    //     autocomplete: list_selector
    // })
    // .string('collection', '选择想要关注的收藏集（留空为关注全部内容）', {required: false,
    //     autocomplete: async (focused, options, i) => {
    //         const targetUser = BotClient.getUser(options.getString('user'));
    //         if (!targetUser) return [];
    //         const collection = await dcn.Collection.fetchFromUser(targetUser.id);
    //         return collection.filter(c => c.name.toLowerCase().includes(focused.value.toLowerCase())).map(collection => ({
    //             name: collection.name,
    //             value: collection.name
    //         }))
    //     }
    // })
    .execute(async (i, options) => {
        const targetUser = BotClient.getUser(options.user);
        if (!targetUser) throw `用户 ${options.user} 并不在天照网络当中`
        // const collection = options.collection 
        //     ? await dcn.Collection.fetch(options.collection) .catch(err => undefined)
        //         ?? await dcn.Collection.fetchName(targetUser.id, options.collection).catch(err => undefined)
        // : undefined; 
        // const list = options.list
        //     ? await dcn.List.fetch(options.list).catch(err => undefined)
        //         ?? await dcn.List.fetchName(i.user.id, options.list).catch(err => undefined)
        //         ?? await dcn.List.create({
        //             name: options.list,
        //             userId: i.user.id,
        //             default: false
        //         })
        //     : await dcn.List.fetchDefault(i.user.id)
        const list = await DCN.List.fetchDefault(i.user.id);
        const follow = await DCN.Follow.fetchFromListWithTarget(list.id, targetUser.id).catch(err => undefined) 
            ?? await DCN.Follow.create({
                userId: i.user.id,
                targetUserId: targetUser.id,
                listId: list.id,
                collectionIdList: [],
            })
        // if (collection) await follow.addCollection(collection.id);
        return new Reply().embed(await follow.infoEmbed())
    })
})

.subCommand('unfollow', '取消关注', subcmd => {
    subcmd
    .string('user', '用户名', {required: true,
        autocomplete: async (focused, options, i) => {
            const list = await DCN.Follow.fetchFromUser(i.user.id);
            return [...new Set(list.map(follow => follow.targetUserId)).values()].map(id => BotClient.getUser(id)).filter(user => !!user).map(user => ({
                name: user!.username,
                value: user!.id
            }))
        }
    })
    // .string('list', '选择要从哪个列表中移除（留空为预设列表）', {required: false,
    //     autocomplete: list_selector
    // })
    // .string('collection', '选择想要关注的收藏集（留空为关注全部内容）', {required: false,
    //     autocomplete: async (focused, options, i) => {
    //         const targetUser = BotClient.getUser(options.getString('user'));
    //         if (!targetUser) return [];
    //         const collection = await dcn.Collection.fetchFromUser(targetUser.id);
    //         return collection.filter(c => c.name.toLowerCase().includes(focused.value.toLowerCase())).map(collection => ({
    //             name: collection.name,
    //             value: collection.name
    //         }))
    //     }
    // })
    .execute(async (i, options) => {
        const targetUser = BotClient.getUser(options.user);
        if (!targetUser) throw `用户 ${options.user} 并不在天照网络当中`
        const list = await DCN.List.fetchDefault(i.user.id);
        const followList = await DCN.Follow.fetchFromUserWithTarget(i.user.id, targetUser.id);
        if (!followList.length) throw `你尚未关注 ${targetUser.username}`;
        for (const follow of followList) { await follow.delete()}
        return new Reply(`你已取消关注 ${targetUser.username}`)
    })
})

async function channel_collection_seletor(focused: AutocompleteFocusedOption, options: OptionMap, i: AutocompleteInteraction<'cached'>) {
    const collection = await DCN.Collection.fetchFromUser(i.user.id);
    return collection.filter(c => c.name.toLowerCase().includes(focused.value.toLowerCase())).map(collection => ({
        name: collection.name,
        value: collection.name
    }))
}

async function list_selector(focused: AutocompleteFocusedOption, options: OptionMap, i: AutocompleteInteraction<'cached'>) {
    const list = await DCN.List.fetchFromUser(i.user.id);
    return list.filter(c => c.name.toLowerCase().includes(focused.value.toLowerCase())).map(list => ({
        name: list.name,
        value: list.name
    }))
}