import { Command, CommandIntegrationTypes } from "../module/Bot/Command";
import { MessageBuilder } from "../module/Bot/MessageBuilder";
import { Reply } from "../module/Bot/Reply";
import { $ } from "../module/Util/text";
const time_list = Array(24).fill(undefined).map((_, i) => `${i.toString().padStart(2, '0')}:00`).map(time => ({name: time, value: time}))
const timezone_list = Array(25).fill(undefined).map((_, i) => `GMT${i >= 12 ? '+' : ''}${(i - 12).toString().padStart(2, '0')}:00`).map(timezone => ({name: timezone, value: timezone}))

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
    autocomplete: async (f, options) => {
        const input = options.getString('date');
        if (input.length === 0) {
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
        } else {
            const now = new Date();
            const date_arr = input.split('-');
            const year = (() => {
                let y = date_arr[0]?.length ? +date_arr[0] : NaN;
                let valid = !isNaN(y);
                let value = valid ? y : now.getFullYear();
                return {
                    valid, value,
                    str: value.toString()
                } 
            })()
            const month = (() => {
                let m = date_arr[1]?.length ? +date_arr[1] : NaN;
                let valid = !isNaN(m);
                let value = valid && m > 0 && m < 13 ? m : now.getMonth() + 1;
                return {
                    valid, value,
                    str: value.toString().padStart(2, '0')
                }
            })()
            const date = (() => {
                let maxDate = new Date(year.value, month.value, 0).getDate();
                let d = date_arr[2]?.length ? +date_arr[2] : NaN;
                let valid = !isNaN(d);
                let value = valid && d > 0 && d <= maxDate ? d : now.getDate() > maxDate ? maxDate : now.getDate();
                return {
                    valid, value, str: value.toString().padStart(2, '0')
                }
            })()
            const t = `${year.str}-${month.str}-${date.str}`
            return [{name: t, value: t}]
        }
    }
})
.string('time', '输入时间，预设为现在时间（格式：12:34:56）', {
    autocomplete: async (focused, options, i) => {
        const input = options.getString('time')
        if (!input) return time_list;
        if (!input.length) return time_list;
        if (input.match(/[^0-9:]/)) return time_list;
        const [hour, minute, second] = input.split(':').map(str => ({number: +str, string: str}));
        let s = '', m = '', h = '';
        if (second) if (second.number > 59) s = '00'; else s = second.string.padStart(2, '0');
        if (minute) if (minute.number > 59) m = '00'; else m = minute.string.padStart(2, '0');
        if (hour) if (hour.number > 23) return time_list; else h = hour.string.padStart(2, '0');
        let t = `${h}:${m}${s? `:${s}`:''}`
        if (hour.string.length && (!minute || !minute.string.length)) return [`${h}:00`, `${h}:15`, `${h}:30`, `${h}:45`].map(time => ({name: time, value: time}))
        return [{name: t, value: t}]
    }
})
.string('timezone', '输入当前时区，预设为 GMT+08:00（格式：GMT-11:30）', {
    autocomplete: async (focused, options) => {
        let input = options.getString('timezone');
        if (!input) return timezone_list;
        input = input.replaceAll(/[^0-9:-]/g, '');
        const input_arr = input.split(':');
        const hour = (() => {
            let h = input_arr[0]?.length ? +input_arr[0] : NaN;
            let value = isNaN(h) ? 0 
                        : h < -12 ? -12
                        : h > 12 ? 12
                        : h;
            return { value, str: value.toString().padStart(2, '0')}
        })()
        const minute = (() => {
            let m = input_arr[1]?.length ? +input_arr[1] : NaN;
            let value = isNaN(m) ? 0
                        : m === 0 ? 0 : 30;
            return { value, str: value.toString().padStart(2, '0')}
        })()
        const z = `GMT${hour.value >= 0 ? "+" : ''}${hour.str}:${minute.str}`;
        return [{name: z, value: z}]
    }
})
.boolean('send', '发送到频道让所有人可见，预设为否', {required: false})
.execute(async (i, options) => {
    let offset = 0;
    if (options.timezone) {
        options.timezone = options.timezone.replaceAll(/[^0-9:-]/g, '');
        const timezone_arr = options.timezone.split(':');
        if (timezone_arr.length !== 2) throw `时区格式错误`;
        const negative = timezone_arr[0].startsWith('-');
        const hour = Math.abs(+timezone_arr[0]);
        const minute = +timezone_arr[1];
        offset = (hour * 60_000 * 60 + minute * 60_000) * (negative ? -1 : 1);
    } else offset = 8 * 60_000 * 60;
    const timezone_date = TimezoneDate(offset, UTCDate())
    let date = options.date && options.time ? TimezoneDate(offset, UTCDate(`${options.date}, ${options.time}`))
    : options.date ? TimezoneDate(offset, UTCDate(`${options.date}, ${timezone_date.getHours()}:${timezone_date.getMinutes()}:${timezone_date.getSeconds()}`))
    : options.time ? TimezoneDate(offset, UTCDate(`${timezone_date.getFullYear()}-${timezone_date.getMonth() + 1}-${timezone_date.getDate()}, ${options.time}`))
    : timezone_date;
    const timestamp = +date;
    if (!date.toJSON()) return new Reply(`日期格式错误`)
    return new MessageBuilder()
        .content($([$.Timestamp(timestamp, options.format as any), $.CodeBlock([$.Timestamp(timestamp, options.format as any)])]))
        .ephemeral(!options.send)
})

function UTCDate(str?: string) {
    return new Date(+new Date(str ?? new Date) - 8 * 60_000 * 60);
}

function TimezoneDate(offset: number, date: Date = new Date) {
    return new Date(+date + offset)
}