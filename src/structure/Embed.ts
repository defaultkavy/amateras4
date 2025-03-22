import { APIEmbed, EmbedData } from "discord.js";
import { db } from "../method/db";
import { snowflakes } from "../method/snowflake";
import { Data, DataCreateOptions, DataOptions } from "../module/DB/Data";
import { MessageBuilder } from "../module/Bot/MessageBuilder";

export interface $EmbedOptions extends DataOptions {
    userId: string;
}
export interface $EmbedDB extends $EmbedOptions {
    data: APIEmbed;
}
export interface $Embed extends $EmbedDB {}
export class $Embed extends Data {
    static collection = db.collection<$EmbedDB>('embed');
    static snowflake = snowflakes.embed;

    static async create(options: DataCreateOptions<$EmbedOptions>) {
            const snowflake = this.snowflake.generate(true);
            const data: $EmbedDB = {
                ...options,
                ...snowflake,
                data: {}
            }
            await this.collection.insertOne(data);
            return data;
    }

    static preview($embed: $EmbedDB) {
        return new MessageBuilder()
            .content('讯息预览')
            .embed(embed => {
                embed.data = $embed.data
                if (!$embed.data.description?.length) embed.description('这是 Embed 讯息预览，透过以下按钮能够修改 Embed 的各个元素')
            })
            .actionRow(row => row
                .button('标题 | 注释 | 链接', `embed-basic@${$embed.id}`)
                .button('作者', `embed-author@${$embed.id}`)
                .button('注脚', `embed-footer@${$embed.id}`)
                .button('图片 | 缩图', `embed-image@${$embed.id}`)
                .button('颜色', `embed-color@${$embed.id}`)
            )
            // .actionRow(row => row
            // )
    }
}