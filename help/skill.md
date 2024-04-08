# 技能功能 `/skill`
系统会记录每一位伺服器成员的讯息活动（除了机器人），设定技能后，可以根据指定的频道来总结出成员在该频道的活跃记录。这个活跃的值将会以等级和经验值来显示在用户的个人名片上。

## 关于技能等级的计算方式
- 在技能的指定频道中，每一条用户发送的讯息，都会为该用户提升1点技能经验值。
- 每个技能都会有技能阈值，经验值超过阈值后，将会提升等级。
- 注意，每个讯息都在数据库中留下了记录，意味着如果讯息被删除，用户的技能经验值将会减少。
- 由于上述特性，因为用户在该频道之前的讯息记录，导致在之后技能创建时，该用户的经验值已经被累计。
- 你可以随时更改技能的阈值，由于技能经验值是根据用户发送过的讯息总量，并且实时计算出来的，因此阈值的变动只会影响最终等级的数值。

## 创建技能
- 输入 `/skill create name:<string> channels?:<#channel> threshold?:<number>` 可创建技能。
- `name` 技能名字。
- `channels?` 能够增加技能经验值的频道。必须输入 `#频道名称` 来设定频道，也能够输入多个频道名来设定多个频道。
- `threshold?` 技能等级的阈值，经验值超过这个值后，技能等级将会提升一级。预设为10点。
- 创建技能后，可输入 `/skill info skill:<string>` 查看技能详情。

## 编辑技能
- `/skill rename skill:<skillId>` 可编辑技能名字。
- `/skill intro skill:<skillId>` 可编辑技能简介。
- `/skill threshold skill:<skillId> threshold:<number>` 可设定技能阈值。
- `/skill delete skill:<skillId>` 可删除技能。
- `/skill channels` 技能频道设置。
  - `add skill:<skillId> channels:<#channel>` 增加频道。
  - `remove skill:<skillId> channels:<#channel>` 移除频道。