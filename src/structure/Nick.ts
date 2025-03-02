import { db } from "../method/db";
import { snowflakes } from "../method/snowflake";
import { Data, DataOptions } from "../module/DB/Data";

export interface NickOptions extends DataOptions {
    nick: string;
    ownerId: string;
    default: boolean;
}
export interface NickDB extends NickOptions {}
export interface Nick extends NickDB {}
export class Nick extends Data {
    static collection = db.collection<NickDB>('nick');
    static snowflake = snowflakes.nick

    static async create(options: Omit<NickOptions, 'id' | 'timestamp'>) {
        const snowflake = this.snowflake.generate(true);
        const data: NickDB = {...options, id: snowflake.id, timestamp: snowflake.timestamp}
        await this.collection.insertOne(data);
        return new Nick(data);
    }
}