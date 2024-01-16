import { Embed } from "../module/Bot/Embed";

export function infoEmbed(content: string) {
    return new Embed()
    .color('Yellow')
    .description(content)
}
export function dangerEmbed(content: string) {
    return new Embed()
    .color('Red')
    .description(content)
}