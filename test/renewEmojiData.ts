import { botInit } from "../src/method/botInit";
import { Log } from "../src/module/Log/Log";
import { $Message, $MessageDB } from "../src/structure/$Message";

await botInit()
const messages = await $Message.collection.find().toArray();
const updated: $MessageDB[] = []
const emojiIncludedMessage = messages.filter(data => data.emojis.length);
emojiIncludedMessage.forEach(message => {
    const emojiList = message.emojis.map(emoji => ({
        ...emoji,
        identifier: emoji.identifier.replace('<a:', '').replace('<:', '').replace('>', '')
    }));
    $Message.collection.updateOne({id: message.id}, {$set: {
        emojis: emojiList
    }}).then(_ => {
        updated.push(message);
        new Log(`Message emoji data updated: ${updated.length} / ${emojiIncludedMessage.length}`)
    })
})