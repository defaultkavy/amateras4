import { ChannelType, Guild } from "discord.js";
import { Command } from "../module/Bot/Command";
import { Modal } from "../module/Bot/Modal";
import { addInteractionListener } from "../module/Util/listener";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Reply } from "../module/Bot/Reply";
import { LogChannel } from "../structure/LogChannel";

export const cmd_post = new Command('post', '贴文')
.subCommand('create', '创建贴文', subcmd => {
    subcmd
    .channel('forum', '选择论坛频道', {channel_types: [ChannelType.GuildForum], required: true})
    .execute(async (i, {forum}) => {
        if (forum.type !== ChannelType.GuildForum) return;
        i.showModal(
            new Modal('Forum Post Create', `forum-post-create@${forum.id}`)
                .short('Title', 'title', {max_length: 100, required: true})
                .paragraph('Content', 'content', {max_length: 2000, required: false, placeholder: '如果没有提供封面链接，此处为必填项'})
                .short('Cover Image URL', 'cover', {required: false})
                .data
        )
    })
})

.subCommand('edit', '编辑贴文', subcmd => {
    subcmd
    .execute(async (i, options) => {
        const channel = i.channel;
        if (channel?.type !== ChannelType.PublicThread) throw '必须在指定的贴文中使用';
        if (channel.ownerId !== i.client.user.id) throw `只能编辑 ${i.client.user} 创建的贴文`;
        const message = await channel.fetchStarterMessage();
        if (!message) throw 'Fetch starter message error';
        let content = message.content;
        const firstEmbedUrl = message.embeds[0]?.url;
        const coverUrl = firstEmbedUrl && message.content.startsWith(`${firstEmbedUrl}\n`) ? firstEmbedUrl : '';
        if (coverUrl.length) content = content.replace(`${coverUrl}`, '').trim();
        i.showModal(
            new Modal('Forum Post Edit', `forum-post-edit@${message.id}`)
            .short('Title', 'title', {max_length: 100, value: channel.name})
            .paragraph('Content', 'content', {max_length: 2000, value: content, required: false, placeholder: '如果没有提供封面链接，此处为必填项'})
            .short('Cover Image URL', 'cover', {value: coverUrl, required: false})
            .data
        )
    })
})

addInteractionListener('forum-post-create', async i => {
    if (i.isModalSubmit() === false) return;
    if (!i.inGuild()) return;
    const forumId = i.customId.split('@')[1];
    const forum = await i.guild?.channels.fetch(forumId);
    if (!forum) return;
    if (forum.type !== ChannelType.GuildForum) return;
    const data = {
        title: i.fields.getField('title').value,
        content: i.fields.getField('content').value,
        cover: i.fields.getField('cover').value
    }
    if (!data.content.length && !data.cover.length) throw `贴文内容或封面链接至少需要填写一个`;
    const content = `${data.cover}\n${data.content}`;
    const channel = await forum.threads.create({
        name: data.title,
        message: new MessageBuilder().content(content).data,
    })
    LogChannel.log(i.guildId, `${i.user} 创建了贴文 ${channel}`)
    return new Reply(`贴文已创建：${channel}`)
})

addInteractionListener('forum-post-edit', async i => {
    if (i.isModalSubmit() === false) return;
    if (!i.inGuild()) return;
    const channel = i.channel;
    if (!channel) return;
    if (channel.type !== ChannelType.PublicThread) return;
    const message = await channel.fetchStarterMessage();
    if (!message) return;
    const data = {
        title: i.fields.getField('title').value,
        content: i.fields.getField('content').value,
        cover: i.fields.getField('cover').value
    }
    if (!data.content.length && !data.cover.length) throw `贴文内容或封面链接至少需要填写一项`;
    try {
        if (data.title !== channel.name) channel.edit({
            name: data.title
        })
        await message.edit({
            content: `${data.cover}\n${data.content}`,
        })
    } catch(err) {}
    LogChannel.log(i.guildId, `${i.user} 编辑了贴文 ${channel}`)
    return new Reply(`贴文已编辑：${message.url}`)
})