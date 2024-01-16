import { Collection } from "mongodb";
import { Data, DataOptions } from "./Data";

export class DbMethod {
    static create<Options extends DataOptions, Instance>(collection: Collection<any>, instance: {new(options: any): Instance}) {
        return async (options: Options) => {
            await collection.insertOne(options);
            return new instance(options)
        }
    }
}