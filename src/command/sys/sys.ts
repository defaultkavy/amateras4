import { Command } from "../../module/Bot/Command";
import { sys_game } from "./game";
import { sys_music } from "./music";
import { sys_vid } from "./vid";

export const cmd_sys = new Command('sys', 'Amateras System command');
sys_vid();
sys_game();
sys_music();