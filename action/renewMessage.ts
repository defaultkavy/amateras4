import { Log } from "../src/module/Log/Log";
import { BotClient } from "../src/structure/BotClient";
import { botInit } from "../src/method/botInit";
import { $Message, $MessageDB } from "../src/structure/$Message";

await botInit(true);
await $Message.collection.deleteMany({bot: true}).then(result => new Log(`Bot Message Data Deleted: ${result.deletedCount}`));
const messageList = await $Message.collection.find().toArray();
const messageSet = new Set<$MessageDB>();
messageList.forEach(data => messageSet.add(data));
let [updated] = [0]
let [channelMissing, messageError] = [0, 0]

const expectedRemoveList: $MessageDB[] = [];
const interval = setInterval(() => {
    if (messageSet.size === 0) {
        clearInterval(interval)
        new Log(`Message updated: ${updated}, messageError: ${messageError}`)
        return;
    }
    const list = Array.from(messageSet).slice(0, 20);
    for (const data of list) {
        if (expectedRemoveList.includes(data)) return;
    }
    expectedRemoveList.push(...list);
    fetch(list)
}, 2000)

async function fetch(messageList: $MessageDB[]) {
    new Log('Fetch')
    for (const messageData of messageList) {
        const bot = BotClient.getFromGuild(messageData.guildId)[0]
        const guild = bot.client.guilds.cache.get(messageData.guildId);
        if (!guild) { new Log(`get guild failed ${messageData.guildId}`); continue; }
        const channel = guild.channels.cache.get(messageData.channelId);
        if (!channel) { channelMissing+=1; continue; }
        if (!channel.isTextBased()) continue;
        const message = channel.messages.fetch(messageData.id).catch(err => {undefined})
        message.then(message => {
            messageSet.delete(messageData);
            if (!message) {
                messageError +=1;
                return;
            }
            $Message.update(message);
            updated +=1;
            new Log(`Message update: ${message.id}. Count: ${updated}`)
        });
    }
}

