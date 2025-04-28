import { Command } from "../../module/Bot/Command";
import { mod_forum } from "./forum";
import { mod_lobby } from "./lobby";
import { mod_log } from "./log-mode";
import { mod_post } from "./post-mode";
import { mod_stats } from "./stats";
import { mod_voice } from "./voice";
import { mod_welcome } from "./welcome";

export const cmd_mod = new Command('mod', '管理指令')
    .defaultMemberPermissions('0')
mod_lobby();
mod_welcome();
mod_post();
mod_log();
mod_forum();
mod_stats();
mod_voice();