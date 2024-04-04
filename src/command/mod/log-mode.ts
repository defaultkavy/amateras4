import { ChannelType } from "discord.js";
import { Reply } from "../../module/Bot/Reply";
import { LogChannel } from "../../structure/LogChannel";
import { cmd_mod } from "./mod";

export function mod_log() {
    cmd_mod.subCommand('log-mode', '日志模式', subcmd =>
        subcmd
        .channel('channel', '选择文字频道', {required: true, channelTypes: [ChannelType.GuildText]})
        .boolean('enable', '是否开启')
        .execute(async (i, options) => {
            if (typeof options.enable === 'boolean') {
                if (options.enable) {
                    if (options.channel.type !== ChannelType.GuildText) throw '请选择文字频道';
                    await LogChannel.create({
                        channelId: options.channel.id,
                        guildId: options.channel.guildId,
                        clientId: i.client.user.id
                    })
                    return new Reply(`已开启日志模式：${options.channel}`)
                }
                else {
                    const logChannel = await LogChannel.fetch(options.channel.id)
                    await logChannel.delete();
                    return new Reply(`已关闭日志模式：${options.channel}`)
                }
            }
            else {
                const postChannel = await LogChannel.fetch(options.channel.id);
                return new Reply(`此频道已开启日志模式`)
            }
        })
    )
}