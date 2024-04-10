export class $Text {
    content: string;
    constructor(str: TextComponent) {
        this.content = text_renderer(str)
    }
    toString(): string {
        return this.content;
    }
}
export class $Block extends $Text {
    type: 'blockquote' | 'codeblock' | 'none' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    constructor(str: TextComponent, type: $Block['type']) {
        super(str);
        this.type = type;
    }
    toString(): string { 
        switch (this.type) {
            case 'none': return this.content;
            case 'blockquote': return `> ${this.content}`;
            case 'codeblock': return `\`\`\`${this.content}\`\`\``;
            case 'h1': return `# ${this.content}`;
            case 'h2': return `## ${this.content}`;
            case 'h3': return `### ${this.content}`;
            case 'h4': return `#### ${this.content}`;
            case 'h5': return `##### ${this.content}`;
            case 'h6': return `###### ${this.content}`;
        }
    }
}
export class $Inline extends $Text {
    type: 'code' | 'bold' | 'italic' | 'strikethrough' | 'underline' | 'none'
    constructor(text: TextComponent, type: $Inline['type']) {
        super(text);
        this.type = type
    }
    toString(): string {
        switch (this.type) {
            case 'bold': return `**${this.content}**`;
            case 'italic': return `*${this.content}*`;
            case 'code': return `\`${this.content}\``;
            case 'strikethrough': return `~~${this.content}~~`;
            case 'underline': return `__${this.content}__`;
            case 'none': return this.content;
        }
    }
}
export class $Timestamp extends $Text {
    format: 'relative' | 'long-date' | 'short-date' | 'long-time' | 'short-time' | 'long-date-time' | 'short-date-time';
    constructor(timestamp: number | string, format: $Timestamp['format']) {
        super(timestamp);
        this.format = format;
    }
    toString(): string {
        return `<t:${this.content}:${this.formatString}>`
    }
    get formatString() {
        switch (this.format) {
            case 'relative': return 'R';
            case 'long-date': return 'D';
            case 'short-date': return 'd';
            case 'long-time': return 'T';
            case 'short-time': return 't';
            case 'long-date-time': return 'F';
            case 'short-date-time': return 'f';
        }
    }
}
export type TextComponent = string | number | boolean | null | undefined | $Text | TextComponent[]
export type $ = typeof $;
export function $(...styles: $.Style[]) {
    return (textArr: TemplateStringsArray, ...values: any[]) => {
        let txt = '';
        textArr.forEach((text, i) => {
            const value = i > values.length - 1 ? '' : values[i]
            txt+= text + value;
        })
        styles.forEach(style => {
            txt = new $Inline(txt, style).toString();
        })
        return new $Inline(txt, 'none')
    }
}
export namespace $ {
    export function Text(resolver: TextComponent) {
        return text_renderer(resolver);
    }
    export function Line(...text: TextComponent[]) { return new $Block(text, 'none') }
    export function CodeBlock(...text: TextComponent[]) { return new $Block(text, 'codeblock') }
    export function Blockquote(...text: TextComponent[]) { return new $Block(text, 'blockquote')}
    export function H1(...text: TextComponent[]) { return new $Block(text, 'h1') }
    export function H2(...text: TextComponent[]) { return new $Block(text, 'h2') }
    export function H3(...text: TextComponent[]) { return new $Block(text, 'h3') }
    export function H4(...text: TextComponent[]) { return new $Block(text, 'h4') }
    export function H5(...text: TextComponent[]) { return new $Block(text, 'h5') }
    export function H6(...text: TextComponent[]) { return new $Block(text, 'h6') }
    export function Bold(...text: TextComponent[]) { return new $Inline(text, 'bold') }
    export function Underline(...text: TextComponent[]) { return new $Inline(text, 'underline') }
    export function Code(...text: TextComponent[]) { return new $Inline(text, 'code') }
    export function Italic(...text: TextComponent[]) { return new $Inline(text, 'italic') }
    export function Strike(...text: TextComponent[]) { return new $Inline(text, 'strikethrough') }
    export function Timestamp(timestamp: number | string, format: $Timestamp['format'], convert = true) { return new $Timestamp(convert ? timestamp.toString().slice(0, -3) : timestamp, format) }
    export function Emoji(identifier: string, animated: boolean | null = null) { 
        identifier = decodeURI(identifier);
        if (identifier.includes(':')) return new $Inline(`<${animated ? 'a' : ''}:${identifier}>`, 'none')
        else return new $Inline(`${identifier}`, 'none')
    }
    export type Style = 'bold' | 'underline' | 'italic' | 'strikethrough' | 'code'
}
function text_renderer(resolver: TextComponent) {
    resolver = resolver instanceof Array ? resolver : [resolver];
    let txt = '';
    while(resolver.find(item => item instanceof Array)) {
        resolver = resolver.flat();
    }
    resolver.forEach((str, i) => {
        if (str === null) return;
        if (str instanceof $Block) return txt+= `${txt.length ? '\n' : ''}${str}`;
        else return txt+= str
    })
    return txt;
}