# 投票进阶功能 `/poll`

## 设定可选多个选项
- 输入 `/poll option max poll:<poll> value:<value>` 可设定最多可选择的数量。
- 输入 `/poll option min poll:<poll> value:<value>` 可设定最少必须选择的数量。
- `<value>` 可替换为 1~25 之间的数字。
- 若最大选择数量小于最小选择数量，则在设定最大值时自动将最小值设为和最大值同样的值。

## 设定问卷缩图
- 输入 `/poll thumbnail set poll:<poll> url:<url>` 可设定问卷中显示的缩图。
- `<url>` 可替换为图片的网址。
- 你可以在 Discord 上传图片后，复制该图片的网址来作为缩图。
- 该图片讯息若遭到删除，此网址将不再奏效。