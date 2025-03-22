import { config } from "../../bot_config";
import { Snowflake } from "../module/Snowflake";

export const snowflakes = {
    lobby: new Snowflake({epoch: config.epoch, workerId: 0}),
    welcome: new Snowflake({epoch: config.epoch, workerId: 1}),
    vid: new Snowflake({epoch: config.epoch, workerId: 2}),
    vid_link: new Snowflake({epoch: config.epoch, workerId: 3}),
    poll: new Snowflake({epoch: config.epoch, workerId: 4}),
    poll_option: new Snowflake({epoch: config.epoch, workerId: 5}),
    bot: new Snowflake({epoch: config.epoch, workerId: 6}),
    chat: new Snowflake({epoch: config.epoch, workerId: 7}),
    game: new Snowflake({epoch: config.epoch, workerId: 8}),
    game_uid: new Snowflake({epoch: config.epoch, workerId: 9}),
    skill: new Snowflake({epoch: config.epoch, workerId: 10}),
    $member: new Snowflake({epoch: config.epoch, workerId: 11}),
    music_player: new Snowflake({epoch: config.epoch, workerId: 12}),
    dcn_follow: new Snowflake({epoch: config.epoch, workerId: 13}),
    dcn_collection: new Snowflake({epoch: config.epoch, workerId: 14}),
    dcn_list: new Snowflake({epoch: config.epoch, workerId: 15}),
    auto_role: new Snowflake({epoch: config.epoch, workerId: 16}),
    nick: new Snowflake({epoch: config.epoch, workerId: 17}),
    autoTweet: new Snowflake({epoch: config.epoch, workerId: 18}),
    embed: new Snowflake({epoch: config.epoch, workerId: 19}),
}