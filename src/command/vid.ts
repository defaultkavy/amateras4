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
    .boolean('share', '是否分享你的身份卡（留空为否）')
    .execute(async (i, options) => {
        const vid = await VId.fetch(i.user.id);
        return (await vid.infoMessage(i.client, {ephemeral: !options.share, asset: !options.share}));
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
            vid.updateInfo(i.client);
            return new Reply(`**${options.name}** 链接已设定`)
        })  
    })
    
    .subCommand('remove', '移除链接', subcmd => {
        subcmd
        .string('link', '选择链接', {required: true,
            autocomplete: async (focused, _, i) => {
                const vid = await VId.fetch(i.user.id);
                return vid.links.filter(link => link.name.includes(focused.value)).map(link => ({
                    name: `${link.name} (${link.url.substring(0, 50)}${link.url.length > 50 ? '...' : ''})`,
                    value: link.id
                }))
            }
        })
        .execute(async (i, options) => {
            const vid = await VId.fetch(i.user.id)
            const link = await vid.removeLink(options.link);
            vid.updateInfo(i.client);
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
        const vid = await VId.fetch(i.user.id);
        i.showModal(
            new Modal('V-ID Card Edit', `vid_intro_modal@${i.user.id}`)
            .actionRow(row => {
                row.paragraph('Intro', 'intro', {value: vid.intro, required: false})
            })
            .data
        )
    })
})

.subGroup('asset', '素材链接设定', group => {
    group
    .subCommand('set', '设定链接', subcmd => {
        subcmd
        .string('name', '链接名称', {required: true, max_length: 10,
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
            vid.updateInfo(i.client);
            return new Reply(`**${options.name}** 素材链接已设定`)
        })  
    })
    
    .subCommand('remove', '移除链接', subcmd => {
        subcmd
        .string('link', '选择链接', {required: true,
            autocomplete: async (focused, _, i) => {
                const vid = await VId.fetch(i.user.id);
                return vid.assets.filter(link => link.name.includes(focused.value)).map(link => ({
                    name: `${link.name} (${link.url.substring(0, 50)}${link.url.length > 50 ? '...' : ''})`,
                    value: link.id
                }))
            }
        })
        .execute(async (i, options) => {
            const vid = await VId.fetch(i.user.id)
            const link = await vid.removeAsset(options.link);
            vid.updateInfo(i.client);
            return new Reply(`**${link.name}** 链接已移除`)
        })
    })
})

.subCommand('rename', '重命名', subcmd => {
    subcmd
    .string('name', '名字', {required: true})
    .execute(async (i, options) => {
        const vid = await VId.fetch(i.user.id);
        await vid.rename(options.name);
        vid.updateInfo(i.client);
        return new Reply(`已重命名为 **${options.name}**`)
    })
})

addInteractionListener('vid_intro_modal', async i => {
    if (!i.isModalSubmit()) return;
    const userId = i.customId.split('@')[1];
    const vid = await VId.fetch(userId)
    const intro = i.fields.getTextInputValue('intro');
    await vid.setIntro(intro);
    vid.updateInfo(i.client);
    return new Reply(`V身份介绍已设定`)
})