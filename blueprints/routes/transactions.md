# Data Structure

## Transactions.MultilingualString
+ en: `english name` (string, optional) - 英語名称
+ ja: `日本語名称` (string, optional) - 日本語名称
+ kr: `한국어 명칭` (string, optional) - 韓国語名称

## Transactions.AuthorizationsWithTicketTypes
+ id: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImp0aSI6IjMzYjBmYWU5LTYxYTMtNDJiNC05ZTY5LTA2YWZhYmIzYzBlMiIsImlhdCI6MTQ5NTM0OTk2MywiZXhwIjoxNDk1MzUzNTYzfQ.HJ5qZgLg0BKxmv2AdvX1oRZmV_M2Qv8HO8lr2Q5Ia8E` (string, required) - 仮予約ID
+ attributes
    + ticket_type: `001` (string, required) - 券種
    + ticket_type_name (Transactions.MultilingualString, required) - 券種名
    + ticket_type_charge: `1800` (number, required) - 券種料金
    + charge: `1800` (number, required) - 座席単体の料金



# Group Transactions

## 座席仮予約 [/transactions/authorizations]

### 座席仮予約 [POST]
パフォーマンス指定で座席をひとつ仮予約します。複数座席予約の場合は、座席数だけリクエストを投げてください。  
本リクエストのレスポンスに含まれる仮予約IDは、本予約の際に必要になります。アプリケーション側で大切に管理してください。  
空席がない場合、ステータスコード404を返却します。

::: note
This action requires an `access_token` with `transactions` scope.
:::

+ Request (application/json)
    + Attributes
        + performance: `59119065e3157c1884d3c333` (string, required) - 座席を確保したいパフォーマンスID

+ Response 200 (application/json)
    + Attributes
        + data
            + type: `authorizations` (string, required) - リソースタイプ
            + id: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImp0aSI6IjMzYjBmYWU5LTYxYTMtNDJiNC05ZTY5LTA2YWZhYmIzYzBlMiIsImlhdCI6MTQ5NTM0OTk2MywiZXhwIjoxNDk1MzUzNTYzfQ.HJ5qZgLg0BKxmv2AdvX1oRZmV_M2Qv8HO8lr2Q5Ia8E` (string, required) - 仮予約ID
            + attributes - 属性
                + expires_at: `2017-05-10T07:42:25Z` (string, required) - 仮予約有効期限(期限を過ぎると、座席は自動的に解放されます)

+ Response 404 (application/json)
    + Attributes
        + data (object, nullable)

<!-- include(../response/400.md) -->



## 座席仮予約 [/transactions/authorizations/{id}]

+ Parameters
    + id: `59119065e3157c1884d3c333` (string, required) - 仮予約ID

### 座席仮予約解除 [DELETE]
仮予約を解除します。仮予約を解除された座席は、即座に空席として解放されます。

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
仮予約リストから予約を確定します。仮予約IDごとに券種や価格の情報を付与してください。  
仮予約の有効期限を超過していた場合、ステータスコード400を返却します。

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
窓口購入等で購入者情報が不要の場合、適宜固定値を渡してください。
:::

+ Request (application/json)
    + Attributes
        + authorizations: (array[Transactions.AuthorizationsWithTicketTypes], fixed_type) - 仮予約リスト
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
上映日と購入番号から本予約を取り消します。  
該当予約がない場合、ステータスコード404を返却します。

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
