import { APIEmbed, RepliableInteraction, ColorResolvable, resolveColor, ActionRowBuilder, MessageComponentInteraction, Message, MessageReplyOptions, InteractionReplyOptions, MessageType, AnySelectMenuInteraction, ButtonInteraction, CacheType, ModalSubmitInteraction, ChatInputCommandInteraction, UserContextMenuCommandInteraction, MessageContextMenuCommandInteraction } from "discord.js";
import { MessageActionRow } from "./ActionRow";
import { MessageBuilder } from "./MessageBuilder";
export type ReplyInteraction<Cached extends CacheType> = 
| AnySelectMenuInteraction<Cached>
| ButtonInteraction<Cached>
| ModalSubmitInteraction<Cached>
| ChatInputCommandInteraction<Cached>
| UserContextMenuCommandInteraction<Cached>
| MessageContextMenuCommandInteraction<Cached>

export class Reply extends MessageBuilder {
    actionRowList: MessageActionRow[] = []
    isError: boolean = false;
    constructor(message?: string) {
        super();
        this.data.content = message;
    }

    error() {
        this.isError = true;
        return this;
    }

    async reply(i: ReplyInteraction<CacheType>) {
        this.ephemeral(true);
        super.reply(i);
    }
}

export class ReplyError extends Reply {
    constructor(reason: any) {
        super(
            typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : 'Unknown Error'
        )
        this.isError = true;
    }
}