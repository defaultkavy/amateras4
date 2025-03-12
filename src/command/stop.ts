import { Command } from "../module/Bot/Command";
import { MusicPlayer } from "../structure/music/MusicPlayer";
import { Reply } from "../module/Bot/Reply";

export const cmd_stop = new Command('stop', '停止音乐')
.executeInGuild(async (i, options) => {
    await i.deferSlient()
    const voice_channel = i.member.voice.channel;
    if (!voice_channel) throw '你需要先加入正在播放音乐的语音频道';
    const player = MusicPlayer.getFromGuild(i.client.user.id, voice_channel.guildId);
    if (!player) throw '当前没有播放的音乐';
    if (player.channelId !== voice_channel.id) throw '你不在音乐播放的频道';
    player.stop();
    return new Reply('已停止')
})