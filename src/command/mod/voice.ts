import { ChannelType } from "discord.js";
import { cmd_mod } from "./mod";
import { db } from "../../method/db";
import { Reply } from "../../module/Bot/Reply";
import { addClientListener } from "../../module/Util/listener";
const collection = db.collection<VoiceJoinMessageData>('voice-join-message');
interface VoiceJoinMessageData {
    guildId: string;
    channelId: string;
    clientId: string;
}
export function mod_voice() {
    cmd_mod
    .subGroup('voice', '语音频道', group => group
        .subCommand('join-message', '成员加入或离开语音频道时发送通知', subcmd => subcmd
            .boolean('enable', '是否启用（留空则查看指定频道是否启用设定）')
            .executeInGuild(async (i, options) => {
                if (!i.channel?.isVoiceBased()) throw '请在语音频道使用此指令'
                if (options.enable !== undefined) {
                    if (options.enable) await collection.insertOne({
                        guildId: i.guildId,
                        channelId: i.channel.id,
                        clientId: i.client.user.id
                    });
                    else await collection.deleteOne({channelId: i.channel.id});
                    return new Reply(`<#${i.channel.id}> 语音通知设定${options.enable ? '开启' : '关闭'}`);
                } else {
                    const ENABLED = await collection.findOne({guildId: i.guildId, channelId: i.channel.id});
                    return new Reply(`<#${i.channel.id}> 语音通知设定：${ENABLED ? '开' : '关'}`)
                }
            })
        )
    )
}

addClientListener('voiceStateUpdate', async (oldMemberState, newMemberState) => {
    if (oldMemberState.channelId === newMemberState.channelId) return;
    if (newMemberState.channel) {
        const record = await collection.findOne({channelId: newMemberState.channel.id})
        if (record) newMemberState.channel.send({content: `-# ${newMemberState.member} 进入了房间`, allowedMentions: {parse: []}});
    }
    if (oldMemberState.channel) {
        const record = await collection.findOne({channelId: oldMemberState.channel.id})
        if (record) oldMemberState.channel.send({content: `-# ${oldMemberState.member} 离开了房间`, allowedMentions: {parse: []}});
    }
})