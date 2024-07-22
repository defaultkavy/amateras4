import { Command } from "../module/Bot/Command";
import { Reply } from "../module/Bot/Reply";
import { BotClient } from "../structure/BotClient";

export const cmd_bot = new Command('bot', 'Bot 系统指令')
.subCommand('login', '让天照系统登入 Bot 账号', subcmd => {
    subcmd
    .string('token', 'Bot Token', {required: true})
    .executeInGuild(async (i, options) => {
        await i.deferSlient()
        const bot = await BotClient.create({
            token: options.token,
            ownerUserId: i.user.id
        })
        return new Reply(`已登录账号：${bot.client.user.username}。使用链接邀请 Bot 加入你的伺服器：\n${bot.inviteUrl}`)
    })
})
.subCommand('logout', '让天照系统登出 Bot 账号', subcmd => {
    subcmd
    .string('bot', '选择你登记过的机器人', {required: true,
        autocomplete: async (focused, _, i) => {
            const cursor = BotClient.collection.find({ownerUserId: i.user.id});
            const list = await cursor.toArray()
            cursor.close();
            return list.map(bot => ({
                name: bot.username,
                value: bot.id
            }))
        }
    })
    .executeInGuild(async (i, options) => {
        const bot = BotClient.get(options.bot);
        if (i.user.id !== bot.ownerUserId) throw '你不是该机器人的拥有者';
        bot.delete(async () => {
            await new Reply(`已登出账号：${bot.client.user.username}。`).reply(i)
        });
        
    })
})