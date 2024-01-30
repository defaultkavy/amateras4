import { config } from "../../bot_config";
import { Admin } from "./Admin";

export class System {
    static admins = config.system.admins
    static servers = config.system.servers
    constructor() {}

    static init() {
        this.admins.forEach(adminId => Admin.create({userId: adminId}))
    }
}