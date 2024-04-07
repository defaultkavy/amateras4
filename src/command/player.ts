import { Command } from "../module/Bot/Command";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Modal } from "../module/Bot/Modal";
import { Reply } from "../module/Bot/Reply";
import { addInteractionListener } from "../module/Util/util";
import { UserPlayer } from "../structure/user-player/Player";

export const cmd_me = new Command('user', '用户指令')
.subCommand('send', '发送你的名片', subcmd => {
    subcmd
    .execute(async (i, options) => {
        const player = await UserPlayer.fetchFromUser(i.guildId, i.user.id)
        return await player.cardMessage();
    })
})

.subCommand('intro', '编辑你的简介', subcmd => {
    subcmd
    .execute(async (i, options) => {
        const player = await UserPlayer.fetchFromUser(i.guildId, i.user.id);
        i.showModal(
            new Modal(`Edit Player Intro`, `player-intro@${player.id}`)
            .paragraph('Intro', 'intro', {required: false, max_length: 100})
            .data
        )
    })
})

addInteractionListener('player-intro', async i => {
    if (i.isModalSubmit() === false) return;
    const player = await UserPlayer.fetch(i.customId.split('@')[1]);
    await player.editIntro(i.fields.getTextInputValue('intro'));
    return new Reply().embed(await player.cardEmbed());
})