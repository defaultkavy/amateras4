import { GuildStats } from "../../structure/GuildStats";
import { cmd_mod } from "./mod";

export function mod_stats() {
    cmd_mod
    .subCommand('stats', '显示伺服器资讯', subcmd => {
        subcmd
        .boolean('send', '是否发送', {required: false})
        .execute(async (i, options) => {
            if (options.send) {
                await i.reply((await GuildStats.infoMessage(i.guild)).data)
                const message = await i.fetchReply()
                GuildStats.create({
                    channelId: i.channelId,
                    clientId: i.client.user.id,
                    guildId: i.guildId,
                    messageId: message.id
                })
            } else return (await GuildStats.infoMessage(i.guild)).ephemeral(true)
        })
    })
}