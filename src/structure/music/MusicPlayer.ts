import { VoiceBasedChannel, VoiceChannel } from "discord.js";
import { db } from "../../method/db";
import { DataCreateOptions } from "../../module/DB/Data";
import { InGuildData, InGuildDataOptions } from "../InGuildData";
import { AudioPlayer, AudioPlayerStatus, AudioResource, NoSubscriberBehavior, StreamType, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, createAudioResource, generateDependencyReport, joinVoiceChannel } from "@discordjs/voice";
import { Music } from "./Music";
import { snowflakes } from "../../method/snowflake";
import { MusicPlayerPanel } from "./MusicPlayerPanel";
import { Readable } from "stream";

export interface MusicPlayerOptions extends InGuildDataOptions {
    channelId: string;
}
export interface MusicPlayerDB extends MusicPlayerOptions {
    musicId: string | null;
    playbackDuration: number | null;
    resourceDuration: number | null;
    status: AudioPlayerStatus | null;
}
export interface MusicPlayer extends MusicPlayerDB {}

export class MusicPlayer extends InGuildData {
    static collection = db.collection<MusicPlayerDB>('music-player');
    static manager = new Map<string, MusicPlayer>();
    static snowflake = snowflakes.music_player;
    audio_player: AudioPlayer | null = null;
    connection: VoiceConnection | null = null;
    resource: AudioResource | null = null;
    timer: number | null = null;
    constructor(data: MusicPlayerDB) {
        super(data);
    }

    get channel() {
        return this.guild.channels.cache.get(this.channelId) as VoiceBasedChannel;
    }

    private static async create(options: DataCreateOptions<MusicPlayerOptions>) {
        const duplicate = await this.collection.findOne({clientId: options.clientId, guildId: options.guildId});
        if (duplicate) throw `Voice Channel player exists`
        const snowflake = this.snowflake.generate(true);
        const data: MusicPlayerDB = {
            ...options,
            musicId: null,
            playbackDuration: null,
            resourceDuration: null,
            status: null,
            ...snowflake,
        }
        await this.collection.insertOne(data);
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        await instance.init();
        return instance;
    }

    async init() {
        this.getConnection();
        if (this.musicId) this.play(await Music.fetch(this.musicId));
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

    static async fetch(id: string) {
        const data = await this.collection.findOne({id: id});
        if (!data) throw 'Music player not found';
        const instance = new this(data);
        this.manager.set(instance.id, instance);
        await instance.init();
        return instance;
    }

    static getFromGuild(clientId: string, guildId: string) {
        return [...this.manager.values()].find(player => player.clientId === clientId && player.guildId === guildId);
    }

    static async play(channel: VoiceBasedChannel, music: Music) {
        const player = this.getFromGuild(channel.client.user.id, channel.guildId) ?? await MusicPlayer.create({
            channelId: channel.id,
            clientId: channel.client.user.id,
            guildId: channel.guildId,
        })
        player.play(music)
    }

    static async stop(channel: VoiceBasedChannel) {
        const player = this.getFromGuild(channel.client.user.id, channel.guildId);
        if (!player) throw '当前没有播放的音乐';
        if (player.channelId !== channel.id) throw '你不在音乐播放的频道';
        player.stop();
    }

    async delete() {
        MusicPlayer.manager.delete(this.id);
        await MusicPlayer.collection.deleteOne({id: this.id});
    }

    async play(music: Music) {
        const connection = this.getConnection();
        const player = this.getAudioPlayer();
        this.musicId = music.id;
        this.resource = this.createResource(music.stream());
        this.resourceDuration = this.resource.playbackDuration;
        player.play(this.resource);
        connection.subscribe(player);
    }

    pause() {
        this.audio_player?.pause();
        this.panels.forEach(panel => panel.updateInfo())
    }

    async stop() {
        this.audio_player?.stop();
        this.connection?.destroy();
        await this.delete();
        this.panels.forEach(panel => panel.updateInfo())
    }

    private getConnection(): VoiceConnection {
        if (!this.connection) {
            const connection = joinVoiceChannel({
                channelId: this.channelId,
                guildId: this.guildId,
                adapterCreator: this.guild.voiceAdapterCreator
            })
                .on(VoiceConnectionStatus.Signalling, (oldState, newState) => {
                    console.debug(newState.status)
                })
                .on(VoiceConnectionStatus.Ready, (oldState, newState) => {
                    this.panels.forEach(panel => panel.updateInfo())
                    console.debug(newState.status)
                })
                .on(VoiceConnectionStatus.Disconnected, () => {
                    connection.destroy()
                    this.connection = null;
                })
                .on(VoiceConnectionStatus.Destroyed, () => {
                    this.connection = null;
                })
                this.connection = connection;
            return connection;
        } else {
            if (this.connection.joinConfig.channelId === this.channelId) return this.connection;
            else {
                this.connection.destroy();
                return this.getConnection()
            }
        }
    }

    private getAudioPlayer() {
        if (!this.audio_player) {
            const player = createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause
                }
            })
            player.on('stateChange', state => {
                switch (state.status) {
                    case AudioPlayerStatus.Idle: {
                        this.playbackDuration = 0;
                        break;
                    }
                    case AudioPlayerStatus.Paused: {
                        this.playbackDuration = state.playbackDuration;
                        break;
                    }
                    case AudioPlayerStatus.Playing: {
                        this.panels.forEach(panel => panel.updateInfo());
                        break;
                    }
                }
                console.debug(`audio player: ${state.status}`)
                this.status = player.state.status;
                this.update();
            })
            player.on('error', err => {
                console.error(err)
            })
            this.audio_player = player;
            return player;
        } else {
            return this.audio_player;
        }
    }

    private createResource(stream: Readable) {
        const resource = createAudioResource(stream, {
            inlineVolume: true,
            inputType: StreamType.WebmOpus
        });
        // resource.volume?.setVolume(0.2);
        // resource.encoder?.setBitrate(48000);
        return resource;
    }

    async update() {
        MusicPlayer.collection.updateOne({id: this.id}, {$set: {
            channelId: this.channelId,
            musicId: this.musicId,
            status: this.status,
            playbackDuration: this.playbackDuration
        }})
    }

    async fetchMusic() {
        if (this.musicId) return Music.fetch(this.musicId)
    }

    get panels() {
        return [...MusicPlayerPanel.manager.values()].filter(panel => panel.clientId === this.clientId)
    }
}