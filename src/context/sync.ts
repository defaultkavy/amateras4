import { CommandIntegrationTypes } from "../module/Bot/Command";
import { MessageMenuCommand } from "../module/Bot/MenuCommand";

export const cmdx_sync = new MessageMenuCommand('Sync', true)
    .integrationTypes([CommandIntegrationTypes.GUILD_INSTALL, CommandIntegrationTypes.USER_INSTALL])
    .execute(async i => {
        console.debug(i.targetMessage.components)
        return 
    })