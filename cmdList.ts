import { config } from "./bot_config";
import { cmd_bot } from "./src/command/bot";
import { cmd_chat } from "./src/command/chat";
import { cmd_dcn } from "./src/command/dcn";
import { cmd_help } from "./src/command/help";
import { cmd_lobby } from "./src/command/lobby";
import { cmd_mod } from "./src/command/mod/mod";
import { cmd_play } from "./src/command/play";
import { cmd_poll } from "./src/command/poll";
import { cmd_post } from "./src/command/post";
import { cmd_quote } from "./src/command/quote";
import { cmd_skill } from "./src/command/skill";
import { cmd_stop } from "./src/command/stop";
import { cmd_test } from "./src/command/test";
import { cmd_time } from "./src/command/time";
import { cmd_ttt } from "./src/command/ttt";
import { cmd_uid } from "./src/command/uid";
import { cmd_me } from "./src/command/user";
import { cmd_vid } from "./src/command/vid";
import { cmd_x } from "./src/command/x";
import { cmdx_info } from "./src/context/info";
import { cmdx_quote } from "./src/context/quote";
import { cmdx_unsend } from "./src/context/unsend";

export const cmd_list = [
    cmd_lobby,
    cmd_mod,
    cmd_vid,
    cmd_poll,
    cmd_bot,
    cmd_help,
    cmd_chat,
    cmd_post,
    cmd_uid,
    cmd_skill,
    cmd_me,
    cmd_x,
    cmd_quote,
    cmd_time,
    // cmd_play,
    // cmd_stop,
    // cmd_ttt,
    // cmd_dcn,
    cmdx_info,
    cmdx_unsend,
    cmdx_quote
]

if (config.dev) {cmd_list.push(cmd_test)}