import { APIEmbed, Colors, EmbedData, SelectMenuComponentOptionData } from "discord.js";
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

    static editorMessage($embed: $EmbedDB) {
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
            .actionRow(row => row
                .stringSelect(`edit-embed-color-select@${$embed.id}`, [
                    {label: 'Red', value: Colors.Red.toString().toUpperCase(), emoji: '🔴'},
                    {label: 'Blue', value: Colors.Blue.toString().toUpperCase(), emoji: '🔵'},
                    {label: 'Yellow', value: Colors.Yellow.toString().toUpperCase(), emoji: '🟡'},
                    {label: 'Green', value: Colors.Green.toString().toUpperCase(), emoji: '🟢'},
                    {label: 'Orange', value: Colors.Orange.toString().toUpperCase(), emoji: '🟠'},
                    {label: 'Purple', value: Colors.Purple.toString().toUpperCase(), emoji: '🟣'},
                    {label: 'Brown', value: 'b4624a'.toUpperCase(), emoji: '🟤'},
                    {label: 'White', value: Colors.White.toString().toUpperCase(), emoji: '⚪'},
                    {label: 'Black', value: '2f353b'.toUpperCase(), emoji: '⚫'},
                ], {
                    placeholder: '预设颜色选择'
                })
            )
            .actionRow(row => {
                const list: SelectMenuComponentOptionData[] = []
                if ($embed.data.fields) $embed.data.fields.forEach((field, i) => list.push({label: field.name ?? `Field ${i}`, value: i.toString()}))
                if (!$embed.data.fields || $embed.data.fields.length < 25) list.push({label: `新增区块（${$embed.data.fields?.length ?? 0}/25）`, value: 'add-field'})
                row.stringSelect(`embed-field@${$embed.id}`, list, {placeholder: '新增或编辑区块'})
            })
    }
}