// import { BaseGuildTextChannel, ButtonStyle, Message, TextBasedChannel } from "discord.js";
// import { db } from "../../method/db";
// import { InGuildData, InGuildDataOptions } from "../InGuildData";
// import { DataCreateOptions } from "../../module/DB/Data";
// import { Embed } from "../../module/Bot/Embed";
// import { MusicPlayer } from "./MusicPlayer";
// import { AudioPlayerStatus } from "@discordjs/voice";
// import { MessageBuilder } from "../../module/Bot/MessageBuilder";
// import { addClientListener, addInteractionListener } from "../../module/Util/listener";
// import { Music } from "./Music";
// import { $Message } from "../$Message";

// export interface MusicPlayerOptions extends InGuildDataOptions {
//     channelId: string;
//     messageId: string;
// }
// export interface MusicPlayerPanelDB extends MusicPlayerOptions {
//     playerId: string | null;
// }
// export interface MusicPlayerPanel extends MusicPlayerPanelDB {}

// export class MusicPlayerPanel extends InGuildData {
//     static collection = db.collection<MusicPlayerPanelDB>('music-player-panel');
//     static manager = new Map<string, MusicPlayerPanel>();
//     constructor(data: MusicPlayerPanelDB) {
//         super(data);
//     }

//     async init() {
//         this.guild.channels.fetch(this.channelId).catch(err => undefined);
//         if (!this.channel) return this.delete();
//         await this.channel.messages.fetch(this.messageId).catch(err => undefined);
//         if (!this.message) return this.delete();
//         await this.updateInfo();
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

//     static async create(options: DataCreateOptions<MusicPlayerOptions>) {
//         const duplicate = await this.collection.findOne({channelId: options.channelId});
//         if (duplicate) new MusicPlayerPanel(duplicate).delete();
//         const player = MusicPlayer.getFromGuild(options.clientId, options.guildId);
//         const data: MusicPlayerPanelDB = {
//             ...options,
//             id: options.messageId,
//             playerId: player?.id ?? null,
//             timestamp: Date.now()
//         }
//         await this.collection.insertOne(data);
//         const instance = new this(data);
//         this.manager.set(instance.id, instance);
//         return instance;
//     }

//     static async fetch(id: string) {
//         const data = await this.collection.findOne({id: id});
//         if (!data) throw 'Music player panel not found';
//         const instance = new this(data);
//         this.manager.set(instance.id, instance);
//         instance.init();
//         return instance;
//     }

//     static async fetchListFromPlayer(playerId: string) {
//         const cursor = this.collection.find({playerId});
//         const list = await cursor.toArray()
//         cursor.close();
//         return list.map(data => {
//             const instance = new this(data);
//             this.manager.set(data.id, instance);
//             instance.init();
//             return instance;
//         })
//     }

//     static async fetchFromChannel(channelId: string) {
//         const data = await this.collection.findOne({channelId: channelId});
//         if (!data) throw 'Music player panel not found';
//         const instance = new this(data);
//         this.manager.set(instance.id, instance);
//         instance.init();
//         return instance;
//     }

//     static getFromChannel(channelId: string) {
//         return [...this.manager.values()].find(data => data.channelId === channelId);
//     }

//     async updateInfo() {
//         await this.message?.edit((await MusicPlayerPanel.infoMessage(this.player)).data);
//         return this;
//     }

//     async delete() {
//         MusicPlayerPanel.manager.delete(this.id);
//         await MusicPlayerPanel.collection.deleteOne({id: this.id});
//         await this.message?.delete().catch();
//     }

//     static async infoMessage(player?: MusicPlayer) {
//         return new MessageBuilder()
//             .embed(await this.infoEmbed(player))
//             .actionRow(row => {
//                 if (player && player.status !== 'idle') {
//                     console.debug('actionrow', player.status)
//                     if (player.status === 'paused') row.button('Play', 'music_play', {emoji: '▶️', style: ButtonStyle.Primary})
//                     else row.button('Pause', 'music_pause', {emoji: '⏸️', style: ButtonStyle.Primary})
//                     row.button('Stop', 'music_stop', {emoji: '⏹️', style: ButtonStyle.Danger});
//                     row.button('Prev', 'music_prev', {emoji: '⏮️', disabled: !player.history.length});
//                     row.button('Next', 'music_next', {emoji: '⏭️', disabled: !player.queue.at(1)});
//                 } else {
//                     row.button('Play', 'music_play', {emoji: '▶️', style: ButtonStyle.Primary})
//                 }
//             })
//     }

//     static async infoEmbed(player?: MusicPlayer) {
//         const music = player ? player.queue[0] ? await Music.fetch(player.queue[0].musicId) : null : null;
//         const embed = new Embed()
//             .max()
//             .footer('天照系统 | 音乐播放器')

//         if (!music || !player) {
//             return embed
//                 .title('请输入 YouTube 音乐链接')
//                 .color('Grey')
//         } else {
//             const author = await music.fetchAuthor();
//             return embed
//                 .author(author.name, {url: author.channel_url, icon_url: author.thumbnailUrl})
//                 .title(music.title)
//                 .url(music.url)
//                 .thumbnail(music.thumbnailUrl)
//                 .description(music.description)
//                 .timestamp(new Date().toISOString())
//                 .color(player.status === AudioPlayerStatus.Playing ? 'Green' : player.status === AudioPlayerStatus.Paused ? 'Blue' : 'Grey')
//         }
//     }

//     get channel(): TextBasedChannel | undefined {
//         return this.guild.channels.cache.get(this.channelId) as TextBasedChannel;
//     }

//     get message() {
//         if (!this.channel || this.channel instanceof BaseGuildTextChannel === false) return;
//         return this.channel.messages.cache.get(this.messageId) as Message<true>;
//     }

//     get player() {
//         return MusicPlayer.getFromGuild(this.clientId, this.guildId);
//     }
// }

// addClientListener('messageCreate', async message => {
//     if (message.author.bot) return;
//     if (!$Message.isValid(message)) return;
//     const panel = MusicPlayerPanel.getFromChannel(message.channelId);
//     if (!panel) return;
//     if (!message.member) return;
//     if (!message.member.voice.channel) return;
//     const url = message.content.trim();
//     try { await Music.validURL(url) }
//     catch(err) { 
//         const reply = await message.reply(new MessageBuilder()
//         .content(err as string)
//         .data)
//         setTimeout(() => {
//             message.delete().catch(e => undefined);
//             reply.delete().catch(e => undefined);
//         }, 10_000);
//         return;
//     }
//     const reply = await message.reply(new MessageBuilder()
//         .content('正在加载音乐')
//         .data)
//     const music = await Music.fetchYouTubeMusic(url);
//     const player = await MusicPlayer.get(message.member.voice.channel);
//     player.controller.addMusic(message.member.voice.channel, music);
//     reply.edit(new MessageBuilder().content('已将歌曲加入播放清单').data).catch(e => undefined)
//     setTimeout(() => {
//         message.delete().catch(e => undefined);
//         reply.delete().catch(e => undefined);
//     }, 10_000);
// })

// addInteractionListener('music', async (i) => {
//     if (!i.inCachedGuild()) return;
//     if (!i.channel) return;
//     if (!i.isButton()) return;
//     const panel = MusicPlayerPanel.getFromChannel(i.channel.id);
//     const player = panel?.player;
//     if (!player) return;
//     switch (i.customId) {
//         case 'music_play': {
//             await player.controller.unpause();
//             break;
//         }
//         case 'music_stop': {
//             await player.controller.stop();
//             break;
//         }
//         case 'music_pause': {
//             player.controller.pause();
//             break;
//         }
//         case 'music_next': {
//             await player.controller.next();
//             break;
//         }
//         case 'music_prev': {
//             await player.controller.prev();
//             break;
//         }
//     }
//     const messageBuilder = await MusicPlayerPanel.infoMessage(player);
//     i.update(messageBuilder.data)
// })