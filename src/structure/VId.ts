import { ButtonStyle, Client, Interaction, MessageType } from "discord.js";
import { config } from "../../bot_config";
import { db } from "../method/db";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Data, DataOptions } from "../module/DB/Data";
import { ErrLog } from "../module/Log/Log";
import { Snowflake } from "../module/Snowflake";
import { URLRegex, getUTCTimestamp } from "../module/Util/util";
import { Lobby } from "./Lobby";
import { addInteractionListener } from "../module/Util/listener";
import { snowflakes } from "../method/snowflake";

export interface VIdOptions extends DataOptions {
    userId: string;
    name: string;
    intro: string;
}
export interface VIdDB extends VIdOptions {
    links: LinkDB[];
    assets: LinkDB[];
}
export interface VId extends VIdDB {}
export class VId extends Data {
    static collection = db.collection<VIdDB>('vid');
    static snowflake = snowflakes.vid;
    static link_snowflake = snowflakes.vid_link;
    constructor(data: VIdDB) {
        super(data);
        if (!this.assets) this.assets = [];
    }

    static async create(options: Omit<VIdOptions, 'id' | 'timestamp'>) {
        const snowflake = this.snowflake.generate(true);
        const data: VIdDB = {
            ...options,
            ...snowflake,
            links: [],
            assets: []
        }
        await this.collection.insertOne(data)
        return new VId(data)
    }

    static async fetch(userId: string) {
        const data = await VId.collection.findOne({userId: userId});
        if (!data) throw `V身份不存在`;
        return new VId(data);
    }

    static async safeFetch(userId: string) {
        const data = await VId.collection.findOne({userId: userId});
        if (!data) return null;
        return new VId(data);
    }

    async delete() {
        await VId.collection.deleteOne({id: this.id})
        const cursur = Lobby.collection.find({memberIdList: this.userId})
        const lobbyData_list = await cursur.toArray();
        cursur.close();
        lobbyData_list.forEach(async data => {
            const lobby = new Lobby(data);
            lobby.deleteAssetMessage(this.userId);
        })
    }

    async infoMessage(client: Client<true>, options?: {asset?: boolean, ephemeral?: boolean, lobby?: boolean}) {
        const {asset, ephemeral, lobby} = options ?? {};
        const links_text = this.links.map(link => `[${link.name}](${link.url})`).toString().replaceAll(',', ' · ')
        const asset_text = this.assets.map(link => `[${link.name}](${link.url})`).toString().replaceAll(',', ' · ')
        const user = await client.users.fetch(this.userId);
        return new MessageBuilder({ephemeral}).embed(embed => {
                embed
                .max()
                .author('V-ID Card')
                .thumbnail(user.displayAvatarURL())
                .description(`## ${this.name} \n${this.intro.length ? `${this.intro}\n` : ''}${this.links.length ? `\n${links_text}` : ''}`)
                if (asset && this.assets.length) embed.field('素材', asset_text)
                embed
                .field('用户名', `<@${this.userId}>`, true)
                .field('更新时间', `<t:${getUTCTimestamp()}:R>`, true)
            })
            .actionRow(row => {
                row.button('更新资讯', `vid_info_update${asset ? '?asset' : ''}${lobby ? '?lobby' : ''}@${this.userId}`);
                if (lobby) return;
                if (ephemeral) return;
                row.button('撤回讯息', `vid_info_delete@${this.userId}`, {style: ButtonStyle.Danger});
            })
            .ephemeral(ephemeral)
    }

    async updateInfo(client: Client<true>) {
        const cursur = Lobby.collection.find({memberIdList: this.userId})
        const lobbyData_list = await cursur.toArray();
        cursur.close();
        lobbyData_list.forEach(async data => {
            const lobby = new Lobby(data);
            lobby.updateAssetMessage(this.userId, await this.infoMessage(client, {asset: true, lobby: true}));
        })
    }

    async setLink(name: string, url: string) {
        if (!url.match(URLRegex)) throw `链接格式错误: ${name} (${url})`
        const snowflake = VId.link_snowflake.generate(true);
        this.links.push({name, url, ...snowflake})
        await VId.collection.updateOne({id: this.id}, {$push: {links: {name, url, ...snowflake}}})
    }

    async removeLink(id: string) {
        const link = this.links.filter(link => link.id === id)[0];
        this.links = this.links.filter(link => link.id !== id);
        await VId.collection.updateOne({id: this.id}, {$pull: {links: {id: id}}})
        return link;
    }

    async setAsset(name: string, url: string) {
        if (!url.match(URLRegex)) throw `链接格式错误: ${name} (${url})`
        const snowflake = VId.link_snowflake.generate(true);
        this.assets.push({name, url, ...snowflake})
        await VId.collection.updateOne({id: this.id}, {$push: {assets: {name, url, ...snowflake}}})
    }

    async removeAsset(id: string) {
        const link = this.assets.filter(link => link.id === id)[0];
        this.assets = this.assets.filter(link => link.id !== id);
        await VId.collection.updateOne({id: this.id}, {$pull: {assets: {id: id}}})
        return link;
    }

    async setIntro(content: string) {
        this.intro = content;
        await VId.collection.updateOne({id: this.id}, {$set: {intro: content}})
    }

    async rename(name: string) {
        await VId.collection.updateOne({id: this.id}, {$set: {name: name}})
        this.name = name;
    }
}

addInteractionListener('vid_info_update', async i => {
    if (!i.isButton()) return;
    const userId = i.customId.split('@')[1];
    const assetEnabled = i.customId.includes('?asset');
    const isLobbyMessage = i.customId.includes('?lobby');
    if (!userId) throw new ErrLog('VId: user id missing');
    const vid = await VId.fetch(userId);
    const infoMessageBuilder = await vid.infoMessage(i.client, {asset: assetEnabled, lobby: isLobbyMessage});
    await i.update(infoMessageBuilder.data);
})
addInteractionListener('vid_info_delete', async i => {
    if (!i.isButton()) return;
    if (!i.message.interaction) return;
    if (i.message.interaction.user !== i.user) throw '只限指令使用者操作' 
    await i.deferUpdate();
    i.message.delete();
})

export interface LinkDB {
    id: string; 
    timestamp: number; 
    name: string; 
    url: string
}