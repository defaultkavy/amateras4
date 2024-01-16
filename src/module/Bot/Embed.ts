import { APIEmbed, ColorResolvable, resolveColor } from "discord.js";

export class Embed {
    data: APIEmbed;
    constructor(config?: APIEmbed) {
        this.data = config ?? {};
    }

    title(text: string) {
        this.data.title = text;
        return this;
    }

    thumbnail(url: string | undefined) {
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

    image(url: string | undefined) {
        if (!url) return this;
        this.data.image = {
            url: url
        }
        return this;
    }

    author(name: string, url?: string) {
        this.data.author = {
            name: name,
            url: url
        }
        return this;
    }

    description(text?: string) {
        this.data.description = text;
        return this;
    }

    color(color: ColorResolvable) {
        this.data.color = resolveColor(color);
        return this;
    }

    max() {
        if (!this.data.image) this.image('https://cdn.discordapp.com/attachments/804531217495752775/1175188158871257251/800x1-00000000.png')
        return this;
    }

}