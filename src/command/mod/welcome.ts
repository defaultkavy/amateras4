import { Reply } from "../../module/Bot/Reply";
import { WelcomeMessage } from "../../structure/WelcomeMessage";
import { cmd_mod } from "./mod";

export function mod_welcome() {
    cmd_mod.subGroup('welcome', '新成员讯息', group => {
        group
        .subCommand('set', '设定', subcmd => {
            subcmd
            .channel('channel', '选择发送讯息的频道', {required: true})
            .string('content', '讯息内容 | $member: mention member', {required: true})
            .execute(async (i, options) => {
                if (!options.channel.isTextBased()) throw `${options.channel} 不是文字类型的频道`
                const duplicate = await WelcomeMessage.fetch(i.guildId);
                if (duplicate) duplicate.delete();
                const welcome = await WelcomeMessage.create({
                    guildId: i.guildId,
                    channelId: options.channel.id,
                    content: options.content,
                    clientId: i.client.user.id
                })
                if (duplicate) return new Reply(`新成员信息设定覆盖完成`)
                else return new Reply(`新成员信息设定完成`)
            })
        })
        .subCommand('remove', '移除', subcmd => {
            subcmd
            .execute(async (i, options) => {
                const welcome = await WelcomeMessage.fetch(i.guildId)
                if (!welcome) throw `尚未设定新成员讯息`;
                await welcome.delete();
                return new Reply(`新成员讯息功能已关闭`)
            })
        })
    })
}