import { ChannelType } from "discord.js";
import { Reply } from "../../module/Bot/Reply";
import { PostChannel } from "../../structure/PostChannel";
import { cmd_mod } from "./mod";
export function mod_post() {
    cmd_mod.subCommand('post-mode', '贴文模式', subcmd => 
    subcmd
        .channel('channel', '选择文字频道', {channelTypes: [ChannelType.GuildText]})
        .boolean('enable', '是否开启')
        .executeInGuild(async (i, options) => {
            await i.deferSlient();
            const channel = options.channel ?? i.channel;
            if (!channel) throw 'Channel Error';
            if (typeof options.enable === 'boolean') {
                if (options.enable) {
                    if (channel.type !== ChannelType.GuildText) throw '请选择文字频道';
                    await PostChannel.create({
                        channelId: channel.id,
                        guildId: channel.guildId,
                        clientId: i.client.user.id
                    })
                    return new Reply(`已开启贴文模式：${channel}`)
                }
                else {
                    const postChannel = await PostChannel.fetch(channel.id)
                    await postChannel.delete();
                    return new Reply(`已关闭贴文模式：${channel}`)
                }
            }
            else {
                const postChannel = await PostChannel.fetch(channel.id);
                return new Reply(`此频道已开启贴文模式`)
            }
        })
    )
}