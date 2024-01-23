# 自定义 Bot 功能（1/2） `/bot`
天照系统允许所有用户使用自己的机器人（Bot）账号，加入天照的机器人管理矩阵中。这意味着你的机器人也能够享有天照机器人的功能以及互通天照系统的资料库。

## 开设 Bot 账号
在[Discord 开发者应用程序界面](https://discord.com/developers/applications/)创建你的应用程序，无需任何条件你便能轻松拥有一个机器人帐号了。

## 设定你的 Bot
在开发者界面中，左侧菜单点选 Bot 栏，你能够在这里设定机器人的名字以及头像。设定完成后，请记得在 Privileged Gateway Intents 项目中打开以下选项：
- PRESENCE INTENT
- SERVER MEMBERS INTENT
- MESSAGE CONTENT INTENT

## 你的机器人准备就绪
至此，你已设定好你的机器人了！回到 Bot 页面设定头像的右侧，点击 Reset Token 来获取你的 Bot Token！

> 请注意！Bot Token 相当于是你的机器人的账号名字和密码，这串字符绝不要轻易外泄。

请点击下方的【下一页】按键，完成最后一步。