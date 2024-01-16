import { Command } from "../module/Bot/Command";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Modal } from "../module/Bot/Modal";
import { Reply } from "../module/Bot/Reply";
import { addInteractionListener } from "../module/Util/util";
import { VId } from "../structure/VId";

export const cmd_vid = new Command('vid', 'V身份')
.subCommand('register', 'V身份注册', subcmd => {
    subcmd
    .string('name', 'V身份全名', {required: true})
    .execute(async (i, options) => {
        if (await VId.safeFetch(i.user.id)) throw `你已注册过V身份`
        const vid = await VId.create({
            name: options.name,
            userId: i.user.id,
            intro: ''
        })
        return new Reply(`**${vid.name}**注册成功`)
    })
})
.subCommand('info', 'V身份资讯', subcmd => {
    subcmd
    .execute(async (i, options) => {
        const vid = await VId.fetch(i.user.id);
        return await vid.infoMessage(true);
    })
})

.subGroup('link', '编辑链接', group => {
    group
    .subCommand('set', '设定链接', subcmd => {
        subcmd
        .string('name', '链接名称', {required: true,
            autocomplete: (focused, i) => {
                const link_list = ['YouTube', 'Twitter', 'X', 'Facebook', 'Instagram', 'Twitch']
                return link_list.filter(link => link.toLowerCase().includes(focused.value.toLowerCase())).map(link => ({
                    name: link, value: link
                }))
            }
        })
        .string('url', '链接', {required: true})
        .execute(async (i, options) => {
            await i.deferSlient();
            const vid = await VId.fetch(i.user.id)
            await vid.setLink(options.name, options.url);
            return new Reply(`**${options.name}** 链接已设定`)
        })  
    })
    
    .subCommand('remove', '移除链接', subcmd => {
        subcmd
        .string('link', '选择链接', {required: true,
            autocomplete: async (focused, _, i) => {
                const vid = await VId.fetch(i.user.id);
                return vid.links.filter(link => link.name.includes(focused.value)).map(link => ({
                    name: `${link.name} (${link.url})`,
                    value: link.id
                }))
            }
        })
        .execute(async (i, options) => {
            const vid = await VId.fetch(i.user.id)
            const link = await vid.removeLink(options.link);
            return new Reply(`**${link.name}** 链接已移除`)
        })
    })
})

.subCommand('destroy', '删除V身份资讯', subcmd => {
    subcmd
    .execute(async (i, options) => {
        const vid = await VId.fetch(i.user.id);
        await vid.delete();
        return new Reply(`V身份资讯已删除`);
    })
})

.subCommand('intro', '设定介绍', subcmd => {
    subcmd.execute(async (i, options) => {
        i.showModal(
            new Modal('V-ID Card Edit', `vid_intro_modal@${i.user.id}`)
            .actionRow(row => {
                row.paragraph('Intro', 'intro')
            })
            .data
        )
    })
})

.subGroup('asset', '素材链接设定', group => {
    group
    .subCommand('set', '设定链接', subcmd => {
        subcmd
        .string('name', '链接名称', {required: true,
            autocomplete: (focused, i) => {
                const link_list = ['跳图', '立绘', '封面立绘']
                return link_list.filter(link => link.toLowerCase().includes(focused.value.toLowerCase())).map(link => ({
                    name: link, value: link
                }))
            }
        })
        .string('url', '链接', {required: true})
        .execute(async (i, options) => {
            await i.deferSlient();
            const vid = await VId.fetch(i.user.id)
            await vid.setAsset(options.name, options.url);
            return new Reply(`**${options.name}** 素材链接已设定`)
        })  
    })
    
    .subCommand('remove', '移除链接', subcmd => {
        subcmd
        .string('link', '选择链接', {required: true,
            autocomplete: async (focused, _, i) => {
                const vid = await VId.fetch(i.user.id);
                return vid.assets.filter(link => link.name.includes(focused.value)).map(link => ({
                    name: `${link.name} (${link.url})`,
                    value: link.id
                }))
            }
        })
        .execute(async (i, options) => {
            const vid = await VId.fetch(i.user.id)
            const link = await vid.removeAsset(options.link);
            return new Reply(`**${link.name}** 链接已移除`)
        })
    })
})

.subCommand('help', '功能指南', subcmd => {
    subcmd.execute(i => {
        return new MessageBuilder({ephemeral: true})
            .embed(embed => {
                embed
                .description(`### V-ID Card\n用户可注册V身份后，编辑自己的V身份资讯，将自己的V身份卡分享到文字频道中。\n输入 \`/vid\` 可查看所用相关指令。`)
    })})
})

addInteractionListener('vid_intro_modal', async i => {
    if (!i.isModalSubmit()) return;
    const userId = i.customId.split('@')[1];
    const vid = await VId.fetch(userId)
    const intro = i.fields.getTextInputValue('intro');
    await vid.setIntro(intro);
    return new Reply(`V身份介绍已设定`)
})