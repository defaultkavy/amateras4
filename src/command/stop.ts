import { Command } from "../module/Bot/Command";
import { MusicPlayer } from "../structure/music/MusicPlayer";
import { Reply } from "../module/Bot/Reply";

export const cmd_stop = new Command('stop', '停止音乐')
.executeInGuild(async (i, options) => {
    await i.deferSlient()
    const voice_channel = i.member.voice.channel;
    if (!voice_channel) throw '你需要先加入正在播放音乐的语音频道';
    MusicPlayer.stop(voice_channel);
    return new Reply('已停止')
})