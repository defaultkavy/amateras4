import { Command, CommandIntegrationTypes } from "../module/Bot/Command";
import { MessageBuilder } from "../module/Bot/MessageBuilder";

export const cmd_x = new Command('x', 'X（Twitter）链接转换指令', true)
.integrationTypes([CommandIntegrationTypes.GUILD_INSTALL, CommandIntegrationTypes.USER_INSTALL])
.string('url', 'X（Twitter）贴文链接', {required: true})
    .execute(async (i, options) => {
    const url = options.url.replace('x.com', 'vxtwitter.com')
    return new MessageBuilder().content(url)
})