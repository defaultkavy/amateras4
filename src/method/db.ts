import { MongoClient } from "mongodb";
import { config } from "../../bot_config";
import { Log } from "../module/Log/Log";
new Log(`MongoDB connecting...(${config.db.host})`);
const mongo = await new MongoClient(config.db.host, {
    auth: config.db.auth
}).connect().then()
new Log('MongoDB connected')

export const db = mongo.db(config.dev ? config.db.dev_name : config.db.name)