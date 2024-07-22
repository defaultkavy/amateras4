import { Command, CommandIntegrationTypes } from "../module/Bot/Command"
import { MessageBuilder } from "../module/Bot/MessageBuilder"
import { $ } from "../module/Util/text"

export const cmd_quote = new Command('quote', '引用格式', true)
.integrationTypes([CommandIntegrationTypes.GUILD_INSTALL, CommandIntegrationTypes.USER_INSTALL])
.string('content', '输入引用内容', {required: true})
.string('name', '输入引用作者名字', {required: true})
.string('time', '输入日期（格式：2000-12-31）', {required: false})
    .execute(async (i, options) => {
        const timestamp = options.time ? +new Date(options.time) : NaN;
        new MessageBuilder()
        .content($.Text([
            $.Blockquote([
                $.H1(options.content),
                $.Subtext([
                    '——', options.name, $.If(timestamp, (timestamp) => [', ', $.Timestamp(timestamp, 'long-date')])
                ])
            ])
        ]))
        .reply(i, {allowedMentions: {parse: []}})
})