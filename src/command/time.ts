import { Command, CommandIntegrationTypes } from "../module/Bot/Command";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Reply } from "../module/Bot/Reply";
import { $ } from "../module/Util/text";
const time_list = Array(24).fill(undefined).map((_, i) => `${i.toString().padStart(2, '0')}:00`).map(time => ({name: time, value: time}))
export const cmd_time = new Command('time', '获取 Discord 日期格式', true)
.integrationTypes([CommandIntegrationTypes.GUILD_INSTALL, CommandIntegrationTypes.USER_INSTALL])
.string('format', '日期显示格式', {required: true, choices: [
    {name: 'relative', value: 'relative'},
    {name: 'short time', value: 'short-time'},
    {name: 'long time', value: 'long-time'},
    {name: 'short date', value: 'short-date'},
    {name: 'long date', value: 'long-date'},
    {name: 'long date with short time', value: 'short-date-time'},
    {name: 'long date with day of week and short time', value: 'long-date-time'},
]})
.string('date', '输入日期，预设为今日日期（格式：2000-12-31）', {
    autocomplete: async () => {
        const [today, yesterday, tomorrow, after_tomorrow] = Array(4).fill(undefined).map(() => new Date());
        yesterday.setDate(today.getDate() - 1);
        tomorrow.setDate(today.getDate() + 1);
        after_tomorrow.setDate(today.getDate() + 2);
        const getDateString = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        const date_data = [
            getDateString(yesterday),
            getDateString(tomorrow),
            getDateString(after_tomorrow)
        ]
        return date_data.map((date_string) => ({
            name: date_string,
            value: date_string
        }))
    }
})
.string('time', '输入时间，预设为现在时间（格式：12:34:56）', {
    autocomplete: async (focused, options, i) => {
        const input = options.getString('time')
        if (!input.length) return time_list;
        if (input.match(/[^0-9:]/)) return time_list;
        if (input[0].match(/[0-9]/)) {
            if (+input > 23) return time_list;
            else return [`${input}:00`, `${input}:15`, `${input}:30`, `${input}:45`].map(time => ({name: time, value: time}))
        } else return time_list;
    }
})
.boolean('send', '发送到频道让所有人可见，预设为否', {required: false})
.execute(async (i, options) => {
    const now = new Date();
    const date = options.date && options.time ? new Date(`${options.date}, ${options.time}`)
    : options.date ? new Date(`${options.date}, ${now.getHours}:${now.getMinutes()}:${now.getSeconds()}`)
    : options.time ? new Date(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}, ${options.time}`)
    : now;
    if (!date.toJSON()) return new Reply(`日期格式错误`)
    return new MessageBuilder()
        .content($([$.Timestamp(+date, options.format as any), $.CodeBlock([$.Timestamp(+date, options.format as any)])]))
        .ephemeral(!options.send)
})