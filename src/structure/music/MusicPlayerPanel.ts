import { Message, TextBasedChannel } from "discord.js";
import { db } from "../../method/db";
import { InGuildData, InGuildDataOptions } from "../InGuildData";
import { DataCreateOptions } from "../../module/DB/Data";
import { Embed } from "../../module/Bot/Embed";
import { MusicPlayer } from "./MusicPlayer";
import { AudioPlayerStatus } from "@discordjs/voice";
import { MessageBuilder } from "../../module/Bot/MessageBuilder";

export interface MusicPlayerOptions extends InGuildDataOptions {
    channelId: string;
    messageId: string;
}
export interface MusicPlayerPanelDB extends MusicPlayerOptions {
    playerId: string | null;
}
export interface MusicPlayerPanel extends MusicPlayerPanelDB {}

export class MusicPlayerPanel extends InGuildData {
    static collection = db.collection<MusicPlayerPanelDB>('music-player-panel');
    static manager = new Map<string, MusicPlayerPanel>();
    constructor(data: MusicPlayerPanelDB) {
        super(data);
    }

    async init() {
        await this.channel.messages.fetch(this.messageId).catch(err => {
            return this.delete();
        });
        await this.message.edit((await MusicPlayerPanel.infoMessage(this.player)).data)
    }

    static async init(clientId: string, guildId: string) {
        const cursor = this.collection.find({guildId, clientId});
        const list = await cursor.toArray()
        cursor.close();
        return list.map(data => {
            const instance = new this(data);
            this.manager.set(data.id, instance);
            instance.init();
            return instance;
        })
    }

    static async create(options: DataCreateOptions<MusicPlayerOptions>) {
        const duplicate = await this.collection.findOne({channelId: options.channelId});
        if (duplicate) new MusicPlayerPanel(duplicate).delete();
        const player = MusicPlayer.getFromGuild(options.clientId, options.guildId);
        const data: MusicPlayerPanelDB = {
            ...options,
            id: options.messageId,
            playerId: player?.id ?? null,
            timestamp: Date.now()
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        return instance;
    }

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw 'Music player panel not found';
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        instance.init();
        return instance;
    }

    static async fetchListFromPlayer(playerId: string) {
        const cursor = this.collection.find({playerId});
        const list = await cursor.toArray()
        cursor.close();
        return list.map(data => {
            const instance = new this(data);
            this.manager.set(data.id, instance);
            instance.init();
            return instance;
        })
    }

    async delete() {
        MusicPlayerPanel.manager.delete(this.id);
        await MusicPlayerPanel.collection.deleteOne({id: this.id});
        await this.message?.delete().catch();
    }

    static async infoMessage(player?: MusicPlayer) {
        return new MessageBuilder().embed(await this.infoEmbed(player))
    }

    static async infoEmbed(player?: MusicPlayer) {
        const music = await player?.fetchMusic();
        const embed = new Embed()
            .max()
            .footer('天照系统 | 音乐播放器')

        if (!music || !player) {
            return embed
                .title('请输入 YouTube 音乐链接')
                .color('Grey')
        }
        else {
            const author = await music.fetchAuthor();
            return embed
                .author(author.name, {url: author.channel_url, icon_url: author.thumbnailUrl})
                .title(music.title)
                .url(music.url)
                .thumbnail(music.thumbnailUrl)
                .description(music.description)
                .timestamp(new Date().toUTCString())
                .color(player.status === AudioPlayerStatus.Playing ? 'Green' : player.status === AudioPlayerStatus.Paused ? 'Blue' : 'Grey')
        }
    }

    get channel() {
        return this.guild.channels.cache.get(this.channelId) as TextBasedChannel;
    }

    get message() {
        return this.channel.messages.cache.get(this.messageId) as Message<true>;
    }

    get player() {
        return this.playerId ? MusicPlayer.manager.get(this.playerId) as MusicPlayer : undefined;
    }
}