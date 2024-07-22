import { ChannelType } from "discord.js";
import { cmd_mod } from "./mod";
import { AutoTag } from "../../structure/AutoTag";
import { Reply } from "../../module/Bot/Reply";

export function mod_forum() {
    cmd_mod.subGroup('forum', 'Forum settings', group => {
        group
        .subCommand('autotag', '贴文发布时自动贴上标签', subcmd => {
            subcmd
            .channel('forum', '选择论坛频道', {channel_types: [ChannelType.GuildForum], required: true})
            .string('tag', '选择标签', {
                required: true,
                autocomplete: async (focused, options, i) => {
                    const forumId = options.getString('forum');
                    const forum = i.guild.channels.cache.get(forumId);
                    if (!forum) return [];
                    if (forum.type !== ChannelType.GuildForum) return [];
                    AutoTag.manager.get
                    return forum.availableTags.map(tag => ({
                        name: `${tag.name} - ${AutoTag.manager.get(tag.id) ? '已开启' : '已关闭'}`,
                        value: tag.id
                    }))
                }
            })
            .boolean('enable', '是否开启', {required: true})
            .executeInGuild(async (i, options) => {
                const forum = options.forum;
                if (forum.type !== ChannelType.GuildForum) return;
                if (!forum.availableTags.find(tag => tag.id === options.tag)) throw '请输入有效的标签'
                if (options.enable) {
                    const autotag = await AutoTag.create({
                        channelId: forum.id,
                        clientId: i.client.user.id,
                        guildId: i.guildId,
                        tagId: options.tag
                    })
                    return new Reply(`已将标签 **${autotag.tag.name}** 设置为自动标签`)
                } else {
                    const autotag = await AutoTag.fetch(options.tag);
                    await autotag.delete();
                    return new Reply(`已关闭自动标签：**${autotag.tag.name}**`)
                }
            })
        })
    })
}