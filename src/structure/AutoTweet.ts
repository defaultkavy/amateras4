// import Client, { auth } from "twitter-api-sdk";
// import { db } from "../method/db";
// import { snowflakes } from "../method/snowflake";
// import { DataOptions } from "../module/DB/Data";
// import { BotClient } from "./BotClient";
// import { GuildTextBasedChannel } from "discord.js";

// export interface AutoTweetOption extends DataOptions {
//     userId: string;
//     twitterUserId: string;
//     twitterUsername: string;
//     token: string;
// }
// export interface AutoTweetDB extends AutoTweetOption {
//     tweetedIds: string[];
//     channels: {guildId: string, channelId: string, clientId: string}[];
// }
// export interface AutoTweet extends AutoTweetDB {}
// export class AutoTweet {
//     static collection = db.collection<AutoTweetDB>('autotweet');
//     static snowflake = snowflakes.autoTweet
//     static updated_timestamp = 0;
//     static update_interval = 60_000 * 15 + 5000;

//     static async create(options: Omit<AutoTweetOption, 'id' | 'timestamp'>) {
//         const duplicate = await this.collection.findOne({token: options.token});
//         if (duplicate) throw 'Token already exist';
//         const snowflake = this.snowflake.generate(true);
//         const data: AutoTweetDB = {
//             ...options,
//             ...snowflake,
//             tweetedIds: [],
//             channels: []
//         }
//         await this.collection.insertOne(data);
//         return data;
//     }

//     static async delete(id: string) {
//         const autoTweet =  await this.collection.findOneAndDelete({id});
//         if (autoTweet) throw '记录不存在'
//         return autoTweet;
//     }

//     static async addChannel(clientId: string, id: string, channel: GuildTextBasedChannel) {
//         const autoTweet = await this.collection.findOneAndUpdate({id}, {$push: {channels: {channelId: channel.id, guildId: channel.guild.id, clientId}}}, {returnDocument: 'after'});
//         if (!autoTweet) throw '记录不存在';
//         return autoTweet;
//     }
//     static async removeChannel(clientId: string, id: string, channel: GuildTextBasedChannel) {
//         const autoTweet = await this.collection.findOneAndUpdate({id}, {$pull: {channels: {channelId: channel.id, guildId: channel.guild.id, clientId}}}, {returnDocument: 'after'});
//         if (!autoTweet) throw '记录不存在';
//         return autoTweet;
//     }

//     static async init() {
//         this.push();
//     }

//     static async push() {
//         const autoTweets = await this.collection.find().toArray();
//         await Promise.all(
//             autoTweets.map(async autoTweet => {
//                 // fetch tweets
//                 const auth_client = new auth.OAuth2Bearer(autoTweet.token);
//                 const x_client = new Client(auth_client);
//                 try {
//                     const tweets = await x_client.tweets.usersIdTweets(autoTweet.twitterUserId, {exclude: ['replies']});
//                     console.debug(autoTweet.twitterUsername, 'tweets', tweets.data?.map(data => data.id));
//                     if (!tweets?.data) return;
//                     const untweeted: typeof tweets.data = [];
//                     for (const tweet of tweets.data) {
//                         if (autoTweet.tweetedIds.includes(tweet.id)) break;
//                         untweeted.push(tweet);
//                     }
//                     console.debug(autoTweet.twitterUsername, 'untweeted', untweeted)
//                     untweeted.reverse();
//                     autoTweet.channels.forEach(async channelDetail => {
//                         const bot = BotClient.manager.get(channelDetail.clientId);
//                         if (!bot) return;
//                         const guild = bot.client.guilds.cache.get(channelDetail.guildId);
//                         if (!guild) return;
//                         const channel = guild.channels.cache.get(channelDetail.channelId);
//                         if (!channel?.isTextBased()) return;
//                         for (const tweet of untweeted) {
//                             await channel.send(`https://vxtwitter.com/${autoTweet.twitterUserId}/status/${tweet.id}`);
//                         }
//                     })
//                     this.collection.updateOne({id: autoTweet.id}, {$set: {tweetedIds: tweets.data.map(t => t.id)}})
//                 } catch(err) {
//                     console.error(err)
//                 }
//             })
//         )
//         this.updated_timestamp = +new Date();
//         setTimeout(() => this.push(), this.update_interval);
//     }
// }