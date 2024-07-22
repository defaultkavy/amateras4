import { GuildStats } from "../../structure/GuildStats";
import { cmd_mod } from "./mod";

export function mod_stats() {
    cmd_mod
    .subGroup('stats', '显示伺服器资讯', group => {
        group
        .subCommand('send', '发送伺服器资讯', subcmd => {
            subcmd
            .executeInGuild(async (i, options) => {
                await i.reply((await GuildStats.infoMessage(i.guild)).data)
                const message = await i.fetchReply();
                GuildStats.create({
                    channelId: i.channelId,
                    clientId: i.client.user.id,
                    guildId: i.guildId,
                    messageId: message.id
                })
            })
        })
        .subCommand('view', '显示伺服器资讯', subcmd => {
            subcmd
            .executeInGuild(async (i, options) => {
                return (await GuildStats.infoMessage(i.guild)).ephemeral(true)
            })
        })
    })
}