import { Command, CommandContexts, CommandIntegrationTypes } from "../module/Bot/Command";
import { Article } from "../structure/Article";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";
import { Reply } from "../module/Bot/Reply";
import { ComponentType } from "discord.js";

export const cmd_article = new Command('article', '文章', true)
.integrationTypes([CommandIntegrationTypes.GUILD_INSTALL, CommandIntegrationTypes.USER_INSTALL])
.contexts([CommandContexts.GUILD])
.subCommand('create', '创建文章', subcmd => subcmd
    .string('title', '文章标题', { required: false })
    .execute(async (i, options) => {
        const article = await Article.create({
            title: options.title ?? 'Untitled',
            userId: i.user.id
        })
        return Article.editorMessage(article, {index: 0});
    })
)

.subCommand('delete', '删除文章', subcmd =>
    articleSelector(subcmd)
    .execute(async (i, options) => {
        const result = await Article.collection.deleteOne({id: options.article, userId: i.user.id})
        if (!result.deletedCount) throw '文章不存在';
        return `已删除文章`;
    })
)

.subCommand('edit', '编辑文章', subcmd => 
    articleSelector(subcmd)
    .execute(async (i, options) => {
        const article = await Article.fetch(options.article);
        return Article.editorMessage(article, {index: 0});
    })
)

.subCommand('send', '发布文章', subcmd => 
    articleSelector(subcmd)
    .boolean('reply', '是否回复指令（预设为否）', {required: false})
    .execute(async (i, options) => {
        const article = await Article.fetch(options.article);
        if (options.reply === false) {
            if (!i.channel?.isSendable()) throw '无法在当前频道发送讯息';
            const message = await i.channel.send(Article.containerMessage(article).data)
            return new Reply(`已发送文章：${message.url}`);
        } else return Article.containerMessage(article);
    })
)

.subCommand('rename', '重命名文章标题', subcmd => 
    articleSelector(subcmd)
    .string('title', '标题', {required: true})
    .execute(async (i, options) => {
        const found = await Article.collection.findOneAndUpdate({id: options.article, userId: i.user.id}, {$set: {title: options.title}});
        if (!found) throw '文章不存在';
        return `已重命名文章为：${options.title}`;
    })
)

.subCommand('sync', '同步文章', subcmd => 
    articleSelector(subcmd)
    .string('message', '讯息ID', {required: true})
    .execute(async (i, options) => {
        const message = await i.channel?.messages.fetch(options.message)
        if (!message) throw '讯息不存在，必须在该讯息所在的频道使用此指令'
        if (message.interactionMetadata?.user !== i.user) throw '你无法同步此文章';
        if (message.components[0].type !== ComponentType.Container) throw '该讯息没有包含文章';
        const article = await Article.fetch(options.article);
        await i.deferReply();
        message.edit(Article.containerMessage(article).data)
        return '已同步'
    })
)

export function articleSelector(subcmd: ExecutableCommand) {
    return subcmd.string('article', '选择文章', {required: true,
        autocomplete: async (focused, _, i) => {
            const embedList = await Article.collection.find({userId: i.user.id}).toArray()
            return embedList.filter(embed => embed.title.includes(focused.value.toLowerCase())).map(embed => ({
                name: `${embed.title} ${new Date(embed.timestamp).toLocaleString('en', {dateStyle: 'short', timeStyle: 'short'})}`,
                value: embed.id
            }))
        }
    })
}