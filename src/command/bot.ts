import { Command } from "../module/Bot/Command";
import { Reply } from "../module/Bot/Reply";
import { BotClient } from "../structure/BotClient";

export const cmd_bot = new Command('bot', 'Bot 系统指令')
.subCommand('login', '让天照系统登入 Bot 账号', subcmd => {
    subcmd
    .string('token', 'Bot Token', {required: true})
    .execute(async (i, options) => {
        const bot = await BotClient.create({
            token: options.token
        })
        return new Reply(`已登录账号：${bot.client.user.username}。使用链接邀请 Bot 加入你的伺服器：\n${bot.inviteUrl}`)
    })
})