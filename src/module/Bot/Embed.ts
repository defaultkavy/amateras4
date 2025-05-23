import { APIEmbed, ColorResolvable, resolveColor } from "discord.js";

export class Embed {
    data: APIEmbed;
    constructor(config?: APIEmbed) {
        this.data = config ?? {};
    }

    title(text?: string | null) {
        if (text) this.data.title = text;
        return this;
    }

    thumbnail(url: string | undefined | null) {
        this.data.thumbnail = url ? {
            url: url,
        } : undefined;
        return this;
    }

    field(name: string, value: string, inline?: boolean) {
        const field = {name: name, value: value, inline: inline};
        if (this.data.fields) this.data.fields.push(field)
        else this.data.fields = [field];
        return this
    }

    emptyField(inline?: boolean) {
        this.field(' ', ' ', inline);
        return this
    }

    image(url: string | undefined) {
        if (!url) return this;
        this.data.image = {
            url: url
        }
        return this;
    }

    author(name: string, options?: {url?: string, icon_url?: string | null}) {
        this.data.author = {
            name: name,
            url: options?.url,
            icon_url: options?.icon_url ?? undefined
        }
        return this;
    }

    description(text?: string | null) {
        if (!text?.length) text = undefined;
        this.data.description = text;
        return this;
    }

    color(color?: ColorResolvable | null) {
        this.data.color = color ? resolveColor(color) : undefined;
        return this;
    }

    max() {
        if (!this.data.image) this.image('https://cdn.discordapp.com/attachments/804531217495752775/1175188158871257251/800x1-00000000.png')
        return this;
    }

    footer(text: string, icon_url?: string | null) {
        this.data.footer = {text, icon_url: icon_url ?? undefined};
        return this;
    }

    timestamp(text: string | undefined) {
        this.data.timestamp = text;
        return this;
    }

    url(url: string | undefined | null) {
        this.data.url = url ?? undefined;
        return this;
    }
}