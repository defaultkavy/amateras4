import { UserMenuCommand } from "../../module/Bot/MenuCommand";
import { VId } from "../../structure/VId";

export const cmdx_info = new UserMenuCommand('info')
    .execute(async i => {
        const vid = await VId.fetch(i.targetUser.id);
        return vid.infoMessage({asset: i.user.id === vid.userId})
    })