import { Command } from "../module/Bot/Command";
import { ExecutableCommand } from "../module/Bot/ExecutableCommand";
import { Reply } from "../module/Bot/Reply";
import { addListener } from "../module/Util/listener";
import { Nick } from "../structure/Nick";

export const cmd_nick = new Command('nick', '快捷设定保存过的昵称，可用于状态设置。')
.subCommand('default', '设置预设的昵称', subcmd => subcmd
    .string('nick', '昵称', {required: true})
    .executeInGuild(async (i, options) => {
        await Nick.collection.findOneAndDelete({ownerId: i.user.id, default: true})
        const nick = await Nick.create({
            ownerId: i.user.id,
            nick: options.nick,
            default: true
        })
        return new Reply(`已设置预设昵称：${nick.nick}`)
    })
)

.subCommand('add', '新增快捷昵称', subcmd => subcmd
    .string('nick', '昵称', {required: true})
    .executeInGuild(async (i, options) => {
        const nick = await Nick.create({
            ownerId: i.user.id,
            nick: options.nick,
            default: false
        })
        return new Reply(`已新增快捷昵称：${nick.nick}`)
    })
)

.subCommand('delete', '删除快捷昵称', subcmd => 
    nickSelector(subcmd)
    .executeInGuild(async (i, options) => {
        const data = await Nick.collection.findOneAndDelete({id: options.nick})
        if (!data) throw '目标快捷昵称不存在';
        return new Reply(`已删除快捷昵称：${data.nick}`)
    })
)

.subCommand('set', '设定快捷昵称', subcmd => 
    nickSelector(subcmd)
    .executeInGuild(async (i, options) => {
        const data = await Nick.collection.findOne({id: options.nick});
        if (!data) throw '目标快捷昵称不存在';
        await i.member.setNickname(data.nick)
        return new Reply(`快捷昵称已应用`)
    })
)

export function nickSelector(subcmd: ExecutableCommand, started: boolean | undefined = undefined, closed = false) {
    return subcmd.string('nick', '选择保存过的快捷昵称', {required: true,
        autocomplete: async (focused, _, i) => {
            const nickList = await Nick.collection.find({ownerId: i.user.id}).toArray()
            return nickList.filter(nick => nick.nick.toLowerCase().includes(focused.value.toLowerCase())).map(nick => ({
                name: `${nick.nick}`,
                value: nick.id
            }))
        }
    })
}

addListener('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.voice.mute && !newMember.voice.mute) {
        const nick = await Nick.collection.findOne({ownerId: newMember.id, default: true})
        if (!nick) return;
        await newMember.setNickname(nick.nick)
    } 
})