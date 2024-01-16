import { APIModalActionRowComponent, APITextInputComponent, ActionRowComponentOptions, BaseSelectMenuComponentData, ButtonComponentData, ButtonStyle, ComponentType, InteractionButtonComponentData, LinkButtonComponentData, SelectMenuComponentOptionData, StringSelectMenuComponentData, TextInputStyle } from "discord.js";

export class MessageActionRow {
    components: ActionRowComponentOptions[] = []
    constructor() {

    }

    button(label: string | undefined, customId: string, config?: Partial<OmittedButtonComponentData>) {
        this.components.push({
            type: ComponentType.Button,
            label: label,
            style: config?.style ?? ButtonStyle.Secondary,
            customId: customId,
            ...config
        })
        return this;
    }

    link(label: string | undefined, url: string, config?: Pick<LinkButtonComponentData, 'disabled' | 'emoji'>) {
        this.components.push({
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            url: url,
            label: label,
            ...config
        })
        return this;
    }

    stringSelect(customId: string, options: SelectMenuComponentOptionData[], config?: Omit<StringSelectMenuComponentData, 'type' | 'customId' | 'custom_id' | 'options'>) {
        this.components.push({
            type: ComponentType.StringSelect,
            options: options,
            customId: customId,
            ...config
        })
        return this;
    }

    objectSelect(customId: string, type: Exclude<keyof typeof ComponentType, 'ActionRow' | 'TextInput' | 'Button' | 'SelectMenu' | 'StringSelect'>, config?: Omit<BaseSelectMenuComponentData, 'type' | 'customId' | 'custom_id'>) {
        this.components.push({
            type: ComponentType[type],
            customId: customId,
            ...config
        })
        return this;
    }

    toJSON() {
        return {
            type: ComponentType.ActionRow,
            components: this.components
        }
    }
}

type OmittedButtonComponentData = Omit<InteractionButtonComponentData, 'label' | 'type' | 'custom_id' | 'customId'>
// type StyledButtonComponentData<Type extends ButtonStyle> = Type extends ButtonStyle.Link ? OmittedButtonComponentData & {url: string} : OmittedButtonComponentData;

export class ModalActionRow {
    data: {
        type: ComponentType.ActionRow
        components: APIModalActionRowComponent[]
    } = {
        type : ComponentType.ActionRow,
        components: []
    }
    constructor() {

    }

    text(label: string, custom_id: string, style: TextInputStyle, config?: Omit<APITextInputComponent, 'label' | 'custom_id' | 'style' | 'type'>) {
        this.data.components.push({
            type: ComponentType.TextInput,
            style: style,
            label: label,
            custom_id: custom_id,
            ...config
        })
        return this;
    }

    short(label: string, custom_id: string, config?: Omit<APITextInputComponent, 'label' | 'custom_id' | 'style' | 'type'>) {
        this.text(label, custom_id, TextInputStyle.Short, config)
        return this;
    }

    paragraph(label: string, custom_id: string, config?: Omit<APITextInputComponent, 'label' | 'custom_id' | 'style' | 'type'>) {
        this.text(label, custom_id, TextInputStyle.Paragraph, config)
        return this;
    }
}