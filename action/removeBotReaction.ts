import { botInit } from "../src/method/botInit";
import { Log } from "../src/module/Log/Log";
import { queue } from "../src/module/Util/util";
import { $Guild } from "../src/structure/$Guild";
import { $Message, $MessageDB } from "../src/structure/$Message";

await botInit()
const messages = await $Message.collection.find().toArray();
const updated: $MessageDB[] = []
const reactionIncludedMessage = messages.filter(data => data.reactions.length);
let [channelError, messageError] = [0, 0]

await queue(reactionIncludedMessage, 20, async (data) => {
    const guild = $Guild.get(data.guildId).guild
    const channel = guild.channels.cache.get(data.channelId);
    if (!channel || !channel.isTextBased()) return channelError += 1;
    try {
        const message = await channel.messages.fetch(data.id);
        await $Message.update(message);
        updated.push(data);
        new Log(`Message updated. ${updated.length + channelError + messageError} / ${reactionIncludedMessage.length}`)
    } catch(err) {
        messageError += 1;
    }
})

new Log(`Message reactions update complete. Updated: ${updated.length}, Message Error: ${messageError}, Channel Error: ${channelError}`)