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
    message?: string;
    embedData: APIEmbed;
    actionRowList: MessageActionRow[] = []
    isError: boolean = false;
    constructor(message?: string, config?: APIEmbed) {
        super();
        this.message = message;
        this.embedData = config ?? {};
    }

    error() {
        this.isError = true;
        return this;
    }

    async reply(i: ReplyInteraction<CacheType>) {
        const emptyEmbed = !Object.entries(this.embedData).length
        const data = {
            content: emptyEmbed ? this.message : undefined, 
            ephemeral: true, 
            embeds: emptyEmbed ? undefined : [{...this.embedData, title: this.message}],
            components: this.actionRowList.map(row => row.toJSON())
        }
        if (i.isMessageComponent()) {
            if (i.message.type === MessageType.Reply) await i[i.deferred ? 'followUp' : 'update'](data).catch(console.error)
            else await i[i.deferred ? 'followUp' : 'reply'](data).catch(console.error)
        }
        else {
            await i[i.deferred ? 'followUp' : 'reply'](data).catch(console.error)
        }
    }
    
    thumbnail(url: string | undefined) {
        this.embedData.thumbnail = url ? {
            url: url,
        } : undefined;
        return this;
    }

    field(name: string, value: string, inline?: boolean) {
        const field = {name: name, value: value, inline: inline};
        if (this.embedData.fields) this.embedData.fields.push(field)
        else this.embedData.fields = [field];
        return this
    }

    image(url: string) {
        this.embedData.image = {
            url: url
        }
        return this;
    }

    description(text: string) {
        this.embedData.description = text;
        return this;
    }

    color(color: ColorResolvable) {
        this.embedData.color = resolveColor(color);
        return this;
    }

    success() {
        this.embedData.color = resolveColor('Green');
        return this;
    }

    warning() {
        this.embedData.color = resolveColor('Yellow');
        return this;
    }

    danger() {
        this.embedData.color = resolveColor('Red');
        return this;
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