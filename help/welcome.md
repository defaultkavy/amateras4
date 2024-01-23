# 欢迎讯息 `/mod welcome`

## 启用功能
- 使用 `/mod welcome set channel:<channel> content:<content>` 可进行欢迎讯息的设定。
- `<channel>` 可选择你想要发送欢迎讯息的文字频道。
- `<content>` 可输入你的自定义内容，在内容中插入 `$member` 变量代表了 `@新成员` 的位置。例如：
  - 输入 `欢迎 $member 加入伺服器！`
  - 得到 `欢迎 @新成员 加入伺服器！`

## 关闭功能
- 使用 `/mod welcome remove` 即可关闭功能。

> 一个伺服器只能有一个频道设定欢迎讯息功能，如果再次设定将会被覆盖。