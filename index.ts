import { botInit } from "./src/method/botInit";
import { Log } from "./src/module/Log/Log";
import { LogChannel } from "./src/structure/LogChannel";
import { PostChannel } from "./src/structure/PostChannel";
import { System } from "./src/structure/System";
import { Game } from "./src/structure/Game";
import { GuildMessage } from "./src/structure/GuildMessage";

// Init
new Log('System Initializing...');
System.init();
await botInit();
GuildMessage;
// Global data load
await PostChannel.init();
await LogChannel.init();
await Game.init();
new Log('System Initialized');
new Log(`Welcome to Amateras 4.`)