import { APIEmbed, ActionRowData, MessageComponentInteraction, MessageType, RepliableInteraction, TextBasedChannel, ThreadMemberFlagsBitField } from "discord.js";
import { MessageActionRow } from "./ActionRow";
import { Embed } from "./Embed";
import { multipleResolver } from "../Util/util";
export interface MessageBuilderData {
    content?: string;
    components?: ActionRowData<any>[],
    embeds?: APIEmbed[];
    ephemeral?: boolean;
}
export class MessageBuilder {
    actionRowList: MessageActionRow[] = [];
    embedList: Embed[] = [];
    data: MessageBuilderData;
    constructor(options?: MessageBuilderData) {
        this.data = options ?? {};
    }

    content(text: string) {
        this.data.content = text;
        return this;
    }

    clean() {
        this.data.content = this.data.content ? this.data.content : '';
        this.data.components = this.data.components ? this.data.components : [];
        this.data.embeds = this.data.embeds ? this.data.embeds : [];
        return this;
    }

    send(channel: TextBasedChannel) {
        return channel.send(this.data)
    }

    embed(resolver: ((embed: Embed) => void) | Multiple<Embed>) {
        if (resolver instanceof Function) {
            const embed = new Embed;
            this.embedList.push(embed)
            resolver(embed)
            this.data.embeds ? this.data.embeds.push(embed.data) : this.data.embeds = [embed.data]
            return this;
        }
        resolver = multipleResolver(resolver);
        for (const resolved of resolver) {
            this.embedList.push(resolved)
            this.data.embeds ? this.data.embeds.push(resolved.data) : this.data.embeds = [resolved.data]
        }
        return this;
    }
    
    actionRow(resolver: ((actionRow: MessageActionRow) => void) | Multiple<MessageActionRow>) {
        if (resolver instanceof Function) {
            const actionRow = new MessageActionRow;
            this.actionRowList.push(actionRow)
            resolver(actionRow)
            this.data.components ? this.data.components.push(actionRow.toJSON()) : this.data.components = [actionRow.toJSON()]
            return this;
        }
        resolver = multipleResolver(resolver);
        for (const resolved of resolver) {
            this.actionRowList.push(resolved)
            this.data.components ? this.data.components.push(resolved.toJSON()) : this.data.components = [resolved.toJSON()]
        }
        return this;
    }

    ephemeral(enable: boolean) {
        this.data.ephemeral = enable;
        return this;
    }

    async reply(i: RepliableInteraction | MessageComponentInteraction, ephemeral?: boolean) {
        this.clean();
        const data = {...this.data}
        if (ephemeral !== undefined) data.ephemeral = ephemeral;
        if (i.isMessageComponent()) {
            if (i.message.type === MessageType.Reply) await i[i.deferred ? 'followUp' : 'update'](data).catch(console.error)
            else await i[i.deferred ? 'followUp' : 'reply'](data).catch(console.error)
        }
        else {
            await i[i.deferred ? 'followUp' : 'reply'](data).catch(console.error)
        }
    }
}