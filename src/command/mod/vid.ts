import { Modal } from "../../module/Bot/Modal";
import { cmd_mod } from "./mod";
import vidJSON from '../../data/vid_data.json';
import { addInteractionListener } from "../../module/Util/util";
import { VId } from "../../structure/VId";
import { Reply } from "../../module/Bot/Reply";

type VIDJSON = {
    name: string;
    intro: string;
    links: {name: string, url: string}[];
    assets: {name: string, url: string}[];
}

export function mod_vid() {
    cmd_mod.subGroup('vid', 'V身份管理', group => {
        group
        .subCommand('create', '创建新的V身份', subcmd => {
            subcmd
            .user('user', '选择用户', {required: true})
            .execute(async (i, options) => {
                if (await VId.safeFetch(options.user.id)) throw '用户已注册';

                i.showModal(new Modal('V-ID Create', `mod_vid_create@${options.user.id}`)
                    .actionRow(row => {
                        row.paragraph('JSON Data', 'data', {required: true, value: JSON.stringify(vidJSON)});
                    })
                .data)
            })
        })
    })
}

addInteractionListener('mod_vid_create', async i => {
    if (!i.isModalSubmit()) return;
    const userId = i.customId.split('@')[1];
    const data = JSON.parse(i.fields.getTextInputValue('data')) as VIDJSON;
    const duplicate = await VId.safeFetch(userId);
    const vid = duplicate ? duplicate : await VId.create({
        name: data.name,
        userId: userId,
        intro: data.intro
    })
    let errlog = '';
    for (const link of data.links) await vid.setLink(link.name, link.url).catch(err => errlog+=`${err}\n`);
    for (const asset of data.assets) await vid.setAsset(asset.name, asset.url).catch(err => errlog+=`${err}\n`);

    return new Reply(`**${vid.name}** Registered with ${errlog === '' ? 'no error' : `error:\n\`\`\`${errlog}\`\`\``}`)
})