import { ChannelType } from "discord.js";
import { Command } from "../module/Bot/Command";
import { PostMode } from "../structure/Post";
import { Reply } from "../module/Bot/Reply";

export const cmd_post = new Command('post', '贴文频道')
.channel('channel', '选择文字频道', {required: true, channelTypes: [ChannelType.GuildText]})
.boolean('enable', '是否开启')
.execute(async (i, options) => {
    if (typeof options.enable === 'boolean') {
        if (options.enable) {
            if (options.channel.type !== ChannelType.GuildText) throw '请选择文字频道';
            await PostMode.create({
                channelId: options.channel.id,
                guildId: options.channel.guildId
            })
            return new Reply(`已开启贴文模式：${options.channel}`)
        }
        else {
            const postChannel = await PostMode.fetch(options.channel.id)
            await postChannel.delete();
            return new Reply(`已关闭贴文模式：${options.channel}`)
        }
    }
    else {
        const postChannel = await PostMode.fetch(options.channel.id);
        return new Reply(`此频道已开启贴文模式`)
    }
})