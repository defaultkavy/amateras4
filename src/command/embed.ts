import { MessageFlags } from "discord.js";
import { Command } from "../module/Bot/Command";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Modal } from "../module/Bot/Modal";
import { addInteractionListener } from "../module/Util/listener";
import { $Embed } from "../structure/Embed";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";
import { Embed } from "../module/Bot/Embed";
import { Reply } from "../module/Bot/Reply";

export const cmd_embed = new Command('embed', '发送 Embed 讯息至该频道', true)
.subCommand('create', '创建 Embed 讯息', subcmd => subcmd
    .execute(async (i, options) => {
        const $embed = await $Embed.create({userId: i.user.id});
        return $Embed.preview($embed);
    })
)

.subCommand('edit', '打开 Embed 编辑器', subcmd =>
    embedSelector(subcmd)
    .execute(async (i, options) => {
        const $embed = await $Embed.collection.findOne({id: options.embed});
        if (!$embed) throw 'Embed 记录不存在';
        return $Embed.preview($embed);
    })
)

.subCommand('send', '发送 Embed 讯息', subcmd => 
    embedSelector(subcmd)
    .boolean('cmd', '是否以回复指令的形式发送讯息？（预设启用）')
    .execute(async (i, options) => {
        const $embed = await $Embed.collection.findOne({id: options.embed});
        if (!$embed) throw 'Embed 记录不存在';
        const messageBuilder = new MessageBuilder().embed(new Embed($embed.data));
        if (options.cmd === true || options.cmd === undefined) return messageBuilder;
        if (!i.channel?.isSendable()) throw '无法在该频道发送讯息';
        await i.channel.send(messageBuilder.data);
        return new Reply('Embed 讯息已发送')
    })
)

.subCommand('remove', '移除 Embed 记录', subcmd =>
    embedSelector(subcmd)
    .execute(async (i, options) => {
        const $embed = await $Embed.collection.findOneAndDelete({id: options.embed});
        if (!$embed) throw 'Embed 记录不存在';
        return new Reply(`Embed 记录已移除：${$embed.data.title ?? 'Untitled'} ${new Date($embed.timestamp).toLocaleString('en', {dateStyle: 'short', timeStyle: 'short'})}`)
    })
)

addInteractionListener('embed', async (i) => {
    if (!i.isButton()) return;
    const [customId, embedId] = i.customId.split('@');
    const $embed = await $Embed.collection.findOne({id: embedId});
    if (!$embed) throw 'Embed 404';
    if ($embed.userId !== i.user.id) throw `只有指令使用者才能编辑内容`
    switch (customId) {
        case 'embed-basic':
            i.showModal(new Modal('编辑标题|注释|链接', `edit-embed-basic@${$embed.id}`)
                .short('标题', 'title', {value: $embed.data.title, required: false})
                .paragraph('注释', 'description', {value: $embed.data.description, required: false})
                .short('链接', 'url', {value: $embed.data.url, required: false})
            .data)
            break;
        case 'embed-author':
            i.showModal(new Modal('编辑作者', `edit-embed-author@${$embed.id}`)
                .short('作者名字', `name`, {max_length: 256, value: $embed.data.author?.name, required: false})
                .short('作者链接', `url`, {value: $embed.data.author?.url, required: false})
                .short('作者图标链接', `icon-url`, {value: $embed.data.author?.icon_url, required: false})
            .data)
            break;
        case 'embed-footer':
            i.showModal(new Modal('编辑注脚', `edit-embed-footer@${$embed.id}`)
                .short('注脚文字', `text`, {max_length: 2048, value: $embed.data.footer?.text, required: false})
                .short('注脚图标链接', `icon-url`, {value: $embed.data.footer?.icon_url, required: false})
            .data)
            break;
        case 'embed-image':
            i.showModal(new Modal('编辑图片与缩图', `edit-embed-image@${$embed.id}`)
                .short('图片链接', `image-url`, {value: $embed.data.image?.url, required: false})
                .short('缩图链接', `thumbnail-url`, {value: $embed.data.thumbnail?.url, required: false})
            .data)
            break;
        case 'embed-color':
            i.showModal(new Modal('编辑颜色', `edit-embed-color@${$embed.id}`)
                .short('颜色代码（HEX）', `color`, {value: $embed.data.color?.toString(16), required: false, placeholder: 'FF23AA'})
            .data)
            break;
    }
})

addInteractionListener('edit-embed', async (i) => {
    if (!i.isModalSubmit()) return;
    const [customId, embedId] = i.customId.split('@');
    const $embed = await $Embed.collection.findOne({id: embedId});
    if (!$embed) throw 'Embed 404';
    switch (customId) {
        case 'edit-embed-basic':
            $embed.data = {
                ...$embed.data,
                title: i.fields.getTextInputValue('title'),
                description: i.fields.getTextInputValue('description'),
                url: i.fields.getTextInputValue('url')
            }
            break;
        case 'edit-embed-author':
            $embed.data = {
                ...$embed.data,
                author: {
                    name: i.fields.getTextInputValue('name'),
                    url: i.fields.getTextInputValue('url'),
                    icon_url: i.fields.getTextInputValue('icon-url')
                }
            }
            break;
        case 'edit-embed-footer':
            $embed.data = {
                ...$embed.data,
                footer: {
                    text: i.fields.getTextInputValue('text'),
                    icon_url: i.fields.getTextInputValue('icon-url')
                }
            }
            break;
        case 'edit-embed-image':
            $embed.data = {
                ...$embed.data,
                image: {
                    url: i.fields.getTextInputValue('image-url'),
                },
                thumbnail: {
                    url: i.fields.getTextInputValue('thumbnail-url')
                }
            }
            break;
        case 'edit-embed-color':
            const color = Number('0x' + i.fields.getTextInputValue('color'))
            if (isNaN(color)) throw '颜色代码不正确';
            $embed.data = {
                ...$embed.data,
                color: color,
            }
            break;
    }
    await $Embed.collection.updateOne({id: $embed.id}, {$set: {data: $embed.data}})
    i.message?.edit($Embed.preview($embed).data)
    i.deferUpdate();
})

export function embedSelector(subcmd: ExecutableCommand) {
    return subcmd.string('embed', '选择你创建的 Embed 记录', {required: true,
        autocomplete: async (focused, _, i) => {
            const embedList = await $Embed.collection.find({userId: i.user.id}).toArray()
            return embedList.filter(embed => embed.data.title ? embed.data.title.includes(focused.value.toLowerCase()): 'Untitled'.includes(focused.value.toLowerCase())).map(embed => ({
                name: `${embed.data.title ?? 'Untitled'} ${new Date(embed.timestamp).toLocaleString('en', {dateStyle: 'short', timeStyle: 'short'})}`,
                value: embed.id
            }))
        }
    })
}