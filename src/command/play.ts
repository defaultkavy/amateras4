import { Command } from "../module/Bot/Command";
import { Music } from "../structure/music/Music";
import { MusicPlayer } from "../structure/music/MusicPlayer";
import { Reply } from "../module/Bot/Reply";

export const cmd_play = new Command('play', '播放音乐')
.string('url', 'YouTube 链接', {required: true})
.executeInGuild(async (i, options) => {
    await i.deferSlient()
    const voice_channel = i.member.voice.channel;
    if (!voice_channel) throw '你需要先加入语音频道';
    Music.validURL(options.url);
    const music = await Music.fetchYouTubeMusic(options.url);
    MusicPlayer.play(voice_channel, music);
    return new Reply('已播放')
})