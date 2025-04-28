// import { VoiceBasedChannel } from "discord.js";
// import { Music } from "./Music";
// import { MusicPlayer } from "./MusicPlayer";

// export class MusicPlayerController {
//     player: MusicPlayer;
//     constructor(player: MusicPlayer) {
//         this.player = player;
//     }

//     async addMusic(channel: VoiceBasedChannel, music: Music) {
//         this.player.queue.push({
//             channelId: channel.id,
//             musicId: music.id
//         })
//         await this.player.update();
//         if (this.player.queue.length === 1) this.play(music);
//     }

//     async play(music: Music) {
//         const connection = await this.player.getConnection();
//         const player = this.player.getAudioPlayer();
//         this.player.resource = this.player.createResource(music.stream());
//         this.player.resourceDuration = this.player.resource.playbackDuration;
//         connection.subscribe(player);
//         player.once('error', () => { this.play(music) })
//         player.play(this.player.resource);
//     }

//     pause() {
//         this.player.audio_player?.pause();
//         this.player.panels.forEach(panel => panel.updateInfo())
//     }

//     async stop() {
//         this.player.audio_player?.stop();
//         this.player.disconnect();
//         await this.player.delete();
//         this.player.updatePanel();
//     }

//     async next() {
//         const nextPosition = this.player.queue[1];
//         const nowPosition = this.player.queue.shift();
//         if (nowPosition) this.player.history.push(nowPosition);
//         if (!nextPosition) return;
//         const music = await Music.fetch(nextPosition.musicId);
//         this.play(music);
//     }

//     async prev() {
//         const prevPosition = this.player.history.at(-1);
//         if (!prevPosition) return;
//         this.player.queue.unshift(prevPosition);
//         const music = await Music.fetch(prevPosition.musicId);
//         this.play(music);
//     }

//     async unpause() {
//         if (this.player.audio_player?.state.status !== 'paused') return;
//         this.player.audio_player.unpause();
//     }
// }