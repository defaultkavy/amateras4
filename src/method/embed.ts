import { AnySelectMenuInteraction, ButtonInteraction } from "discord.js";
import { MessageActionRow } from "../module/Bot/ActionRow";
import { Embed } from "../module/Bot/Embed";
import { MessageBuilder } from "../module/Bot/MessageBuilder";

export function infoEmbed(content: string) {
    return new Embed()
    .color('Yellow')
    .description(content)
}
export function dangerEmbed(content: string) {
    return new Embed()
    .color('Red')
    .description(content)
}

export async function textContent(filepath: string, actionRows?: MessageActionRow[], i?: ButtonInteraction<'cached'> | AnySelectMenuInteraction<'cached'>) {
    const file = Bun.file(filepath)
    const content = await file.text()
    const builder = new MessageBuilder()
    .ephemeral(true)
    .clean()
    .embed(embed => {
        embed.description(content)
    })
    // .content(content)
    if (actionRows) actionRows.forEach(row => builder.actionRow(row));
    if (i) i.update(builder.data);
    else return builder;
}