# Group Authorizations

## 仮予約 [/authorizations]

### 仮予約 [POST]
パフォーマンス指定で座席をひとつ仮予約する

::: note
## 複数座席予約の場合
座席数だけコールすること
:::

+ Request (application/json)
    + Attributes
        + performance: `59119065e3157c1884d3c333` (string, required) - パフォーマンスID

+ Response 200 (application/json)
    + Attributes
        + data
            + type: `authorizations` (string, required) - リソースタイプ
            + id: `59119065e3157c1884d3c333` (string, required) - 仮予約ID
            + attributes - 属性
                + expires_at: `2017-05-10T07:42:25Z` (string, required) - 仮予約有効期限

<!-- include(../response/400.md) -->



## 仮予約 [/authorizations/{id}]

+ Parameters
    + id: `59119065e3157c1884d3c333` (string, required) - 仮予約ID

### 仮予約解除 [DELETE]
ID指定で仮予約を解除する

+ Response 204

+ Response 404 (application/json)
    + Attributes (object)
        + data: null (object, nullable)

<!-- include(../response/400.md) -->

