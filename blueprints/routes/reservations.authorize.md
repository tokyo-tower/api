
## 仮予約 [/reservations/authorize]

### 仮予約 [POST]
パフォーマンス指定で座席をひとつ仮予約する

::: note
## 複数座席予約の場合
座席数だけコールすること
:::

+ Request (application/json)
    + Attributes
        + performance: 123456789 (string) - パフォーマンスID


+ Response 200 (application/json)
    + Attributes
        + data
            + type: reservations (string) - リソースタイプ
            + id: 123456789 (string) - 予約ID
            + attributes - 属性
                + expires_at: `2017-05-10T07:42:25Z` (string) - 仮予約有効期限

<!-- include(../response/400.md) -->
