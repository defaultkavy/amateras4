import { Command } from "../module/Bot/Command";
import { MessageBuilder } from "../module/Bot/MessageBuilder";

export const cmd_test = new Command('test', 'Debug command')
// .execute(async i => {
//     return new MessageBuilder()
//     .content('https://www.youtube.com/shorts/HWW5KZ7D2XA')
//     // .embed(embed => {
//     //     embed.description('test')
//     // })
// })