// import { Reply } from "../../module/Bot/Reply";
// import { MusicPlayerPanel } from "../../structure/music/MusicPlayerPanel";
// import { cmd_sys } from "./sys";

// export function sys_music() {
//     cmd_sys
//     .subGroup('music', 'Music function', group => {
//         group
//         .subCommand('panel', 'Music panel message', subcmd => {
//             subcmd
//             .executeInGuild(async (i) => {
//                 await i.deferSlient();
//                 if (!i.channel) return;
//                 const message = await i.channel.send((await MusicPlayerPanel.infoMessage()).data)
//                 const panel = await MusicPlayerPanel.create({
//                     channelId: i.channelId,
//                     clientId: i.client.user.id,
//                     guildId: i.guildId,
//                     messageId: message.id,
//                 })
//                 return new Reply(`播放器面板已创建`)
//             })
//         })
//     })
// }