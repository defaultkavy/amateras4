import { ButtonStyle, ComponentType, MessageFlags } from "discord.js";
import { Command } from "../module/Bot/Command";
import { Article } from "../structure/Article";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";

export const cmd_article = new Command('article', '文章')
.subCommand('create', '创建文章', subcmd => subcmd
    .string('title', '文章标题', { required: false })
    .execute(async (i, options) => {
        const article = await Article.create({
            title: options.title ?? 'Untitled',
            userId: i.user.id
        })
        return Article.editorMessage(article);
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
        return Article.editorMessage(article);
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
            return `已发送文章：${message.url}`
        } else return Article.containerMessage(article);
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