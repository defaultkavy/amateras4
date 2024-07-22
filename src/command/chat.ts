import { ChannelType } from "discord.js";
import { Command } from "../module/Bot/Command";
import { Chat } from "../structure/Chat";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Reply } from "../module/Bot/Reply";

export const cmd_chat = new Command('chat', '在这个频道中启用/关闭机器人聊天模式')
.executeInGuild(async (i, options) => {
    if (i.channel?.type !== ChannelType.GuildText) throw '必须是文字频道';
    await i.deferSlient()
    const duplicate = await Chat.collection.findOne({clientId: i.client.user.id, userId: i.user.id, channelId: i.channelId});
    if (duplicate) {
        await Chat.get(i.client.user.id, i.user.id)?.delete()
        return new Reply('聊天模式已关闭')
    }
    else await Chat.get(i.client.user.id, i.user.id)?.delete();
    const chat = await Chat.create({
        clientId: i.client.user.id,
        guildId: i.guildId,
        userId: i.user.id,
        channelId: i.channelId
    })
    if (i.user.dmChannel) chat.updateInfo();
    return new MessageBuilder()
    .embed(embed => {
        embed.color('Green')
        .description(`### 机器人聊天模式已启动\n请到 ${i.client.user} 的私信频道发送消息，所有发送到 ${i.client.user} 的内容将会透过它的账号发送到这个频道。`);
    })
})