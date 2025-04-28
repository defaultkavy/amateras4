// import { VoiceBasedChannel, VoiceChannel } from "discord.js";
// import { db } from "../../method/db";
// import { DataCreateOptions } from "../../module/DB/Data";
// import { InGuildData, InGuildDataOptions } from "../InGuildData";
// import { AudioPlayer, AudioPlayerStatus, AudioResource, NoSubscriberBehavior, StreamType, VoiceConnection, VoiceConnectionStatus, createAudioPlayer, createAudioResource, generateDependencyReport, joinVoiceChannel } from "@discordjs/voice";
// import { Music } from "./Music";
// import { snowflakes } from "../../method/snowflake";
// import { MusicPlayerPanel } from "./MusicPlayerPanel";
// import { Readable } from "stream";
// import { MusicPlayerController } from "./MusicPlayerController";

// export interface MusicPlayerOptions extends InGuildDataOptions {
//     channelId: string;
// }
// export interface MusicPlayerDB extends MusicPlayerOptions {
//     playbackDuration: number | null;
//     resourceDuration: number | null;
//     status: AudioPlayerStatus | null;
//     queue: MusicPlayerQueueData[];
//     history: MusicPlayerQueueData[];
// }
// export interface MusicPlayer extends MusicPlayerDB {}

// export class MusicPlayer extends InGuildData {
//     static collection = db.collection<MusicPlayerDB>('music-player');
//     static manager = new Map<string, MusicPlayer>();
//     static snowflake = snowflakes.music_player;
//     controller = new MusicPlayerController(this);
//     audio_player: AudioPlayer | null = null;
//     connection: VoiceConnection | null = null;
//     resource: AudioResource | null = null;
//     timer: number | null = null;
//     constructor(data: MusicPlayerDB) {
//         super(data);
//     }

//     get channel() {
//         return this.guild.channels.cache.get(this.channelId) as VoiceBasedChannel;
//     }

//     static async create(options: DataCreateOptions<MusicPlayerOptions>) {
//         const duplicate = await this.collection.findOne({clientId: options.clientId, guildId: options.guildId});
//         if (duplicate) throw `Voice Channel player exists`
//         const snowflake = this.snowflake.generate(true);
//         const data: MusicPlayerDB = {
//             ...options,
//             playbackDuration: null,
//             resourceDuration: null,
//             status: null,
//             queue: [],
//             history: [],
//             ...snowflake,
//         }
//         await this.collection.insertOne(data);
//         const instance = new this(data);
//         this.manager.set(instance.id, instance);
//         await instance.init();
//         return instance;
//     }

//     static async init(clientId: string, guildId: string) {
//         const cursor = this.collection.find({guildId, clientId});
//         const list = await cursor.toArray()
//         cursor.close();
//         return list.map(data => {
//             const instance = new this(data);
//             this.manager.set(data.id, instance);
//             instance.init();
//             return instance;
//         })
//     }

//     static async fetch(id: string) {
//         const data = await this.collection.findOne({id: id});
//         if (!data) throw 'Music player not found';
//         const instance = new this(data);
//         this.manager.set(instance.id, instance);
//         await instance.init();
//         return instance;
//     }

//     static getFromGuild(clientId: string, guildId: string) {
//         return [...this.manager.values()].find(player => player.clientId === clientId && player.guildId === guildId);
//     }

//     static async get(channel: VoiceBasedChannel) {
//         const player = this.getFromGuild(channel.client.user.id, channel.guildId) ?? await MusicPlayer.create({
//             channelId: channel.id,
//             clientId: channel.client.user.id,
//             guildId: channel.guildId,
//         })
//         return player;
//     }

//     async init() {
//         if (this.queue[0]) {
//             this.channelId = this.queue[0].channelId;
//             this.controller.play(await Music.fetch(this.queue[0].musicId));
//         }
//     }

//     disconnect() {
//         this.connection?.disconnect();
//         this.connection = null;
//     }

//     async getConnection(): Promise<VoiceConnection> {
//         if (!this.connection) {
//             return new Promise(resolve => {
//                 const connection = joinVoiceChannel({
//                     channelId: this.channelId,
//                     guildId: this.guildId,
//                     adapterCreator: this.guild.voiceAdapterCreator
//                 })
//                 .on(VoiceConnectionStatus.Signalling, (oldState, newState) => {
//                 })
//                 .on(VoiceConnectionStatus.Ready, (oldState, newState) => {
//                     // this.panels.forEach(panel => panel.updateInfo());
//                     resolve(connection);
//                 })
//                 .on(VoiceConnectionStatus.Disconnected, () => {
//                     connection.destroy()
//                     this.connection = null;
//                 })
//                 .on(VoiceConnectionStatus.Destroyed, () => {
//                     this.connection = null;
//                 })
                
//                 this.connection = connection;
//             })
//         } else {
//             if (this.connection.joinConfig.channelId === this.channelId) return this.connection;
//             else {
//                 this.disconnect();
//                 return await this.getConnection()
//             }
//         }
//     }

//     getAudioPlayer() {
//         if (!this.audio_player) {
//             const player = createAudioPlayer({
//                 behaviors: {
//                     noSubscriber: NoSubscriberBehavior.Pause
//                 }
//             })
//             const stateHandler = async (oldState:any , state: any) => {
//                 console.debug(state.status);
//                 switch (state.status) {
//                     case AudioPlayerStatus.Idle: {
//                         this.status = AudioPlayerStatus.Idle;
//                         if (oldState.status !== 'playing') return;
//                         await this.controller.next();
//                         this.updatePanel();
//                         break;
//                     }
//                     case AudioPlayerStatus.Paused: {
//                         this.status = AudioPlayerStatus.Paused;
//                         this.playbackDuration = state.playbackDuration;
//                         this.update();
//                         this.updatePanel();
//                         break;
//                     }
//                     case AudioPlayerStatus.Playing: {
//                         this.status = AudioPlayerStatus.Playing;
//                         this.updatePanel();
//                         break;
//                     }
//                     case AudioPlayerStatus.Buffering: {
//                         break;
//                     }
//                     case AudioPlayerStatus.AutoPaused: {
//                         break;
//                     }
//                 }
//             }
//             player.addListener('playing', stateHandler)
//             player.addListener('idle', stateHandler)
//             player.addListener('paused', stateHandler)
//             player.addListener('buffering', stateHandler)
//             player.addListener('autopaused', stateHandler)
//             player.on('error', err => {
//                 // console.error(err)
//             })
//             this.audio_player = player;
//             return player;
//         } else {
//             return this.audio_player;
//         }
//     }

//     createResource(stream: Readable) {
//         const resource = createAudioResource(stream, {
//             // inlineVolume: true,
//         });
//         // resource.volume?.setVolume(0.2);
//         // resource.encoder?.setBitrate(48000);
//         return resource;
//     }

//     async update() {
//         MusicPlayer.collection.updateOne({id: this.id}, {$set: {
//             channelId: this.channelId,
//             status: this.status,
//             playbackDuration: this.playbackDuration,
//             queue: this.queue
//         }})
//     }

//     async updatePanel() {
//         this.panels.forEach(panel => panel.updateInfo())
//     }

//     async delete() {
//         MusicPlayer.manager.delete(this.id);
//         await MusicPlayer.collection.deleteOne({id: this.id});
//     }

//     get panels() {
//         return [...MusicPlayerPanel.manager.values()].filter(panel => panel.clientId === this.clientId)
//     }
// }

// interface MusicPlayerQueueData {
//     musicId: string;
//     channelId: string;
// }