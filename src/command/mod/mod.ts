import { Command } from "../../module/Bot/Command";
import { mod_forum } from "./forum";
import { mod_lobby } from "./lobby";
import { mod_log } from "./log-mode";
import { mod_post } from "./post-mode";
import { mod_vid } from "./vid";
import { mod_welcome } from "./welcome";

export const cmd_mod = new Command('mod', '管理指令')
mod_lobby();
mod_welcome();
mod_vid();
mod_post();
mod_log();
mod_forum();