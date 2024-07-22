import { CommandIntegrationTypes } from "../module/Bot/Command";
import { MessageMenuCommand } from "../module/Bot/MenuCommand";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { $ } from "../module/Util/text";

export const cmdx_quote = new MessageMenuCommand('Quote', true)
    .integrationTypes([CommandIntegrationTypes.GUILD_INSTALL, CommandIntegrationTypes.USER_INSTALL])
    .execute(async i => {
        new MessageBuilder()
        .content(`>>> # ${i.targetMessage.content}\n-# ——${$.User(i.targetMessage.author.id)}, ${$.Timestamp(i.targetMessage.createdTimestamp, 'long-date')}`)
        .reply(i, {allowedMentions: {parse: []}})
    })