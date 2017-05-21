# Group Transactions

## 座席仮予約 [/transactions/authorizations]

### 座席仮予約 [POST]
パフォーマンス指定で座席をひとつ仮予約する

::: note
This action requires an `access_token` with `transactions` scope.
:::

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



## 座席仮予約 [/transactions/authorizations/{id}]

+ Parameters
    + id: `59119065e3157c1884d3c333` (string, required) - 仮予約ID

### 座席仮予約解除 [DELETE]
ID指定で仮予約を解除する

::: note
This action requires an `access_token` with `transactions` scope.
:::

+ Response 204

+ Response 404 (application/json)
    + Attributes (object)
        + data: null (object, nullable)

<!-- include(../response/400.md) -->


## 座席本予約 [/transactions/settle]

### 座席本予約 [POST]
仮予約IDリストから予約を確定する

::: note
This action requires an `access_token` with `transactions` scope.
:::

**決済方法**
value                     | type                      | description
:------------------------ | :------------------------ | :------------------------ 
Z                         | string                    | 現金
0                         |                           | クレジットカード

**購入者区分**
value                     | type                      | description
:------------------------ | :------------------------ | :------------------------ 
01                        | string                    | 一般
06                        | string                    | 窓口

**購入者性別**
value                     | type                      | description
:------------------------ | :------------------------ | :------------------------ 
1                         | string                    | 男性
2                         | string                    | 女性

::: note
窓口購入で購入者情報が不要の場合、適宜固定値を渡してください。
:::

+ Request (application/json)
    + Attributes
        + authorizations: (array, fixed_type)
            + `59119065e3157c1884d3c333` (string, required) - 仮予約ID
            + `59119065e3157c1884d3c334` (string, required) - 仮予約ID
        + payment_method: `0` (string, required) - 決済方法
        + purchaser_group: `06` (string, required) - 購入者区分
        + purchaser_first_name: `タロウ` (string, required) - 購入者名
        + purchaser_last_name: `モーションピクチャー` (string, required) - 購入者性
        + purchaser_email: `motionpicture@example.com` (string, required) - 購入者メールアドレス
        + purchaser_tel: `09012345678` (string, required) - 購入者電話番号
        + purchaser_gender: `0` (string, required) - 購入者性別

+ Response 200 (application/json)
    + Attributes
        + data (array[object], fixed-type) - 予約リスト
            + (object) - 予約オブジェクト
                + type: `reservations` (string, required) - リソースタイプ
                + id: `59119065e3157c1884d3c333` (string, required) - 予約ID
                + attributes (object) - 属性
                    + seat_code: `A-1` (string, required) - 座席番号
                    + payment_no: `1234567` (string, required) - 購入番号
                    + qr_str: `123456789` (string, required) - 座席入場QRコード

<!-- include(../response/400.md) -->


## 座席本予約取消 [/transactions/cancel]

### 座席本予約取消 [POST]
上映日と購入番号から本予約を取り消す

::: note
This action requires an `access_token` with `transactions` scope.
:::

+ Request (application/json)
    + Attributes
        + performance_day: `20170511` (string, required) - 上映日
        + payment_no: `1234567` (string, required) - 購入番号

+ Response 204

+ Response 404 (application/json)
    + Attributes (object)
        + data: null (object, nullable)

<!-- include(../response/400.md) -->
