export const URLRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

export function multipleResolver<T>(resolver: Multiple<T>): T[] {
    return resolver instanceof Array ? resolver : [resolver]
}

export function setIntervalAbsolute(unit: 'milisecond' | 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year', callback: () => OrPromise<any>, multiply: number = 1) {
    const now = new Date();
    const next = new Date(now)
    switch (unit) {
        case 'year': next.setFullYear(unit === 'year' ? now.getFullYear() + multiply : 0);
        case 'month': next.setMonth(unit === 'month' ? now.getMonth() + multiply : 0);
        case 'day': next.setDate(unit === 'day' ? now.getDate() + multiply : 0);
        case 'hour': next.setHours(unit === 'hour' ? now.getHours() + multiply : 0);
        case 'minute': next.setMinutes(unit === 'minute' ? now.getMinutes() + multiply : 0);
        case 'second': next.setSeconds(unit === 'second' ? now.getSeconds() + multiply : 0);
        case 'milisecond': next.setMilliseconds(unit === 'milisecond' ? now.getMilliseconds() + multiply : 0);
    }
    
    setTimeout(() => {
        callback()
        setIntervalAbsolute(unit, callback, multiply)
    }, +next - +now);
}

export function getUserIdFromText(content: string) {
    const match_list = content.match(/\<@([0-9]+)\>/g)
    if (!match_list) throw '请输入至少一个用户的@名字';
    const mention_list = Array.from(match_list);
    return mention_list.map(mention => {
        return mention.replace('<@', '').replace('>', '')
    })
}

export function getUTCTimestamp(timestamp = Date.now()) {
    return `${timestamp}`.slice(0, -3);
}

export function substringWith(content: string, start: number, end: number, replace?: string) {
    return `${content.substring(start, end)}${content.length > end ? replace : ''}`
}

export function codeBlock(content: string) {
    return `\`\`\`${content}\`\`\``
}

export function countArrayItem<T>(arr: T[]) {
    const map = new Map<T, {count: number, value: T}>()
    arr.forEach(value => {
        const data = map.get(value) ?? {count: 0, value: value};
        if (map.has(value) === false) map.set(value, data);
        data.count += 1;
    })
    return Array.from(map.values());
}

export function mode<T>(arr: T[]) {
    const countDataList: {count: number, values: T[]}[] = []
    countArrayItem(arr).forEach(data => {
        const record = countDataList.find(countData => countData.count === data.count)
        if (!record) countDataList.push({count: data.count, values: [data.value]});
        else record.values.push(data.value)
    })
    return countDataList.sort((a, b) => b.count - a.count);
}