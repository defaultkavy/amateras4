// import Client, { auth } from "twitter-api-sdk";
// import { Command } from "../module/Bot/Command";
// import { Reply } from "../module/Bot/Reply";
// import { AutoTweet } from "../structure/AutoTweet";
// import { ExecutableCommand } from "../module/Bot/ExecutableCommand";

// export const cmd_tweet = new Command('tweet', '自动转发推文功能')
// .subGroup('token', '管理 Twitter Bearer Token 记录', group => group
//     .subCommand('add', '新增 Twitter Bearer Token 记录', subcmd => subcmd
//         .string('token', '输入你的 Twitter 开发者应用的 Bearer Token', { required: true})
//         .string('username', '输入你想要获取推文的作者用户名字（开头为@）', {required: true})
//         .executeInGuild(async (i, options) => {
//             const auth_client = new auth.OAuth2Bearer(options.token);
//             const x_client = new Client(auth_client);
//             try {
//                 const user = await x_client.users.findUserByUsername(options.username.replaceAll('@', ''));
//                 if (!user.data) return 'Twitter 用户不存在';
//                 await AutoTweet.create({
//                     userId: i.user.id,
//                     token: options.token,
//                     twitterUserId: user.data.id,
//                     twitterUsername: user.data.username
//                 })
//                 return new Reply('设定完成');
//             } catch(err) {
//                 return '向 Twitter 抓取用户资料失败';
//             }
//         })
//     )

//     .subCommand('delete', '移除 Twitter Bearer Token 记录', subcmd => 
//         tokenSelector(subcmd)
//         .executeInGuild(async (i, options) => {
//             await AutoTweet.delete(options.token);
//             return '记录移除成功，所有相关的自动转发推文频道已失效';
//         })
//     )

// )

// .subGroup('channel', '管理自动转发推文频道', group => group
//     .subCommand('set', '设定当前频道为自动转发推文频道', subcmd => 
//         tokenSelector(subcmd)
//         .executeInGuild(async (i, options) => {
//             if (!i.channel) return;
//             await AutoTweet.addChannel(i.client.user.id, options.token, i.channel);
//             return '频道添加成功，新的贴文将会自动发布到这里';
//         })
//     )
    
//     .subCommand('unset', '关闭当前频道的自动转发推文功能', subcmd =>
//         tokenSelector(subcmd)
//         .executeInGuild(async (i, options) => {
//             if (!i.channel) return;
//             await AutoTweet.removeChannel(i.client.user.id, options.token, i.channel);
//             return '频道移除成功';
//         })
//     )
// )

// .subCommand('update', '获取下次更新的时间', subcmd => subcmd
//     .execute(async () => {
//         return new Reply(`下次推文更新时间：<t:${(AutoTweet.updated_timestamp + AutoTweet.update_interval).toString().slice(0, -3)}:R>`)
//     })
// )

// export function tokenSelector(subcmd: ExecutableCommand) {
//     return subcmd.string('token', '选择你保存的 Twitter bearer token 对应的用户名', {required: true,
//         autocomplete: async (focused, _, i) => {
//             const autoTweetList = await AutoTweet.collection.find({userId: i.user.id}).toArray()
//             return autoTweetList.filter(autoTweet => autoTweet.twitterUsername.includes(focused.value.toLowerCase())).map(autoTweet => ({
//                 name: `${autoTweet.twitterUsername}`,
//                 value: autoTweet.id
//             }))
//         }
//     })
// }