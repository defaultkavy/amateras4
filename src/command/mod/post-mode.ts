import { ChannelType } from "discord.js";
import { Reply } from "../../module/Bot/Reply";
import { PostChannel } from "../../structure/PostChannel";
import { cmd_mod } from "./mod";
export function mod_post() {
    cmd_mod.subCommand('post-mode', '贴文模式', subcmd => 
    subcmd
        .channel('channel', '选择文字频道', {required: true, channelTypes: [ChannelType.GuildText]})
        .boolean('enable', '是否开启')
        .execute(async (i, options) => {
            if (typeof options.enable === 'boolean') {
                if (options.enable) {
                    if (options.channel.type !== ChannelType.GuildText) throw '请选择文字频道';
                    await PostChannel.create({
                        channelId: options.channel.id,
                        guildId: options.channel.guildId,
                        clientId: i.client.user.id
                    })
                    return new Reply(`已开启贴文模式：${options.channel}`)
                }
                else {
                    const postChannel = await PostChannel.fetch(options.channel.id)
                    await postChannel.delete();
                    return new Reply(`已关闭贴文模式：${options.channel}`)
                }
            }
            else {
                const postChannel = await PostChannel.fetch(options.channel.id);
                return new Reply(`此频道已开启贴文模式`)
            }
        })
    )
}