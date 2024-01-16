import { APIModalInteractionResponseCallbackData, APITextInputComponent } from "discord.js";
import { ModalActionRow } from "./ActionRow";

export class Modal {
    data: APIModalInteractionResponseCallbackData
    constructor(title: string, customId: string) {
        this.data = {
            title: title,
            custom_id: customId,
            components: []
        }
    }

    actionRow(callback: (actionRow: ModalActionRow) => void) {
        const actionRow = new ModalActionRow();
        callback(actionRow);
        this.data.components.push(actionRow.data);
        return this;
    }

    short(label: string, customId: string, config?: Omit<APITextInputComponent, 'label' | 'custom_id' | 'style' | 'type'>) {
        this.actionRow(row => {
            row.short(label, customId, config)
        })
        return this;
    }

    paragraph(label: string, customId: string, config?: Omit<APITextInputComponent, 'label' | 'custom_id' | 'style' | 'type'>) {
        this.actionRow(row => {
            row.paragraph(label, customId, config)
        })
        return this;
    }
}