import { BotClient } from "../structure/BotClient";
import { client } from "./client";

export async function botInit(debug = false) {
    const bot = new BotClient({
        id: client.user.id,
        timestamp: Date.now(),
        token: client.token,
        ownerUserId: '',
        avatarURL: client.user.avatarURL({size: 1024}),
        username: client.user.username
    }, client)
    BotClient.manager.set(bot.id, bot);
    await bot.init(debug);
    await BotClient.init(debug);
}