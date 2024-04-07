import { MessageMenuCommand } from "../module/Bot/MenuCommand";
import { Reply } from "../module/Bot/Reply";

export const cmdx_unsend = new MessageMenuCommand('Unsend')
    .execute(async i => {
        if (!i.targetMessage.interaction) throw '该讯息无法回收';
        if (i.targetMessage.interaction.user !== i.user) throw '你不是该指令的操作者';
        await i.deferReply({ephemeral: true});
        try {
            await i.targetMessage.delete();
            return new Reply(`指令讯息已删除`);
        } catch(err) {
            throw '指令出错'
        }
    })