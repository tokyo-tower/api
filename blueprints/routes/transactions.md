# Data Structure

## Transactions.MultilingualString
+ en: `english name` (string, optional) - 英語名称
+ ja: `日本語名称` (string, optional) - 日本語名称
+ kr: `한국어 명칭` (string, optional) - 韓国語名称

## Transactions.EventReservation
+ qr_str: `TT-171222-000300-0` (string, required) - QR文字列
+ payment_no: `000300` (string, required) - 購入番号
+ performance: `171222001001010915` (string, required) - パフォーマンスID

## Transactions.SeatReservationOffer
+ ticket_type: `001` (string, required) - 券種ID
+ watcher_name: `メモメモ` (string, required) - 予約メモ


# Group Transactions

## 注文取引開始 [/transactions/placeOrder/start]

### 注文取引開始 [POST]
期限指定で注文取引を開始します。取引の期限が切れると、それまでの仮予約は解除され、取引を確定することはできなくなります。
アプリケーションの購入フローで十分な期間を想定し、期限をセットしてください。

::: note
This action requires an `access_token` with `transactions` scope.
:::

**購入者区分**
| value    | type   | description |
| :------- | :----- | :---------- |
| Customer | string | 一般        |

::: note
販売者識別子は、固定で`TokyoTower`を入力してください。
:::

+ Request (application/json)
    + Headers
        Authentication: Bearer JWT

    + Attributes
        + expires:  `2017-05-10T07:42:25Z` (string, required) - 取引有効期限
        + seller_identifier: `TokyoTower` (string, required) - 販売者識別子
        + purchaser_group: `Customer` (string, required) - 購入者区分

+ Response 201 (application/json)
    + Attributes
        + id: `59119065e3157c1884d3c333` (string, required) - 取引ID
        + agent: (object, required) - 取引主体
        + seller: (object, required) - 販売者
        + expires: `2017-05-10T07:42:25Z` (string, required) - 取引有効期限
        + startDate: `2017-05-10T07:42:25Z` (string, required) - 取引開始日時

<!-- include(../response/400.md) -->
<!-- include(../response/404.md) -->



## 座席仮予約 [/transactions/placeOrder/{transactionId}/actions/authorize/seatReservation]

+ Parameters
    + transactionId: `59119065e3157c1884d3c333` (string, required) - 取引ID

### 座席仮予約 [POST]
パフォーマンス指定で座席を仮予約します。複数座席予約の場合は、座席分のofferを投げてください。 
本リクエストのレスポンスに含まれる仮予約IDは、仮予約削除の際に必要になります。アプリケーション側で大切に管理してください。  
空席がない場合、ステータスコード409を返却します。

::: note
This action requires an `access_token` with `transactions.authorizations` scope.
:::

+ Request (application/json)
    + Headers
        Authentication: Bearer JWT

    + Attributes
        + performance_id: `59119065e3157c1884d3c333` (string, required) - パフォーマンスID
        + offers: (array[Transactions.SeatReservationOffer], fixed-type) - 座席予約供給情報

+ Response 201 (application/json)
    + Attributes
        + id: `59119065e3157c1884d3c333` (string, required) - 仮予約アクションID

<!-- include(../response/400.md) -->
<!-- include(../response/404.md) -->
<!-- include(../response/409.md) -->



## 座席仮予約 [/transactions/placeOrder/{transactionId}/actions/authorize/seatReservation/{actionId}]

+ Parameters
    + transactionId: `59119065e3157c1884d3c333` (string, required) - 取引ID
    + actionId: `59119065e3157c1884d3c333` (string, required) - 仮予約アクションID

### 座席仮予約解除 [DELETE]
仮予約を解除します。仮予約を解除された座席は、即座に空席として解放されます。

::: note
This action requires an `access_token` with `transactions` scope.
:::

+ Request (application/json)
    + Headers
        Authentication: Bearer JWT

+ Response 204

<!-- include(../response/400.md) -->
<!-- include(../response/404.md) -->



## 購入者情報登録 [/transactions/placeOrder/{transactionId}/customerContact]

+ Parameters
    + transactionId: `59119065e3157c1884d3c333` (string, required) - 取引ID

### 購入者情報登録 [PUT]
取引の購入者情報を登録します。

::: note
This action requires an `access_token` with `transactions` scope.
:::

**性別**
| value | type   | description |
| :---- | :----- | :---------- |
| 1     | string | 男性        |
| 2     | string | 女性        |

::: note
窓口購入等で購入者情報が不要の場合、適宜固定値を渡してください。
:::

+ Request (application/json)
    + Headers
        Authentication: Bearer JWT

    + Attributes
        + last_name: `せい` (string, required) - 姓
        + first_name: `めい` (string, required) - 名
        + email: `hello@example.com` (string, required) - メールアドレス
        + tel: `09012345678` (string, required) - 電話番号
        + age: `15` (string, required) - 年代
        + gender: `0` (string, required) - 性別

+ Response 201 (application/json)
    + Attributes
        + last_name: `せい` (string, required) - 姓
        + first_name: `めい` (string, required) - 名
        + email: `hello@example.com` (string, required) - メールアドレス
        + tel: `+819012345678` (string, required) - 電話番号
        + age: `15` (string, required) - 年代
        + address: `JP` (string, required) - 住所
        + gender: `0` (string, required) - 性別

<!-- include(../response/400.md) -->
<!-- include(../response/404.md) -->



## 注文取引確定 [/transactions/placeOrder/{transactionId}/confirm]

+ Parameters
    + transactionId: `59119065e3157c1884d3c333` (string, required) - 取引ID

### 注文取引確定 [POST]
注文取引を確定します。
有効期限を超過していた場合、ステータスコード404を返却します。

::: note
This action requires an `access_token` with `transactions` scope.
:::

**決済方法**
| value | type   | description |
| :---- | :----- | :---------- |
| Cash  | string | 現金        |

+ Request (application/json)
    + Headers
        Authentication: Bearer JWT

    + Attributes
        + payment_method: `Cash` (string, required) - 決済方法

+ Response 201 (application/json)
    + Attributes
        + eventReservations (array[Transactions.EventReservation], fixed-type) - 予約リスト

<!-- include(../response/400.md) -->
<!-- include(../response/404.md) -->



## 返品取引 [/transactions/returnOrder/confirm]

### 返品取引確定 [POST]
上映日と購入番号から本予約を取り消します。  
該当予約がない場合、ステータスコード404を返却します。
また、すでに返品済の場合、ステータスコード409を返却します。

::: note
This action requires an `access_token` with `reservations` scope.
:::

::: note
ツアー開演日までの残日数等、キャンセル対象条件を満たしているかどうかチェックしない場合、forciblyをtrueとしてリクエストしてください。
:::

+ Request (application/json)
    + Headers
        Authentication: Bearer JWT

    + Attributes
        + performance_day: `20170511` (string, required) - 上映日
        + payment_no: `123456` (string, required) - 購入番号
        + cancellation_fee: 1000 (number, required) - キャンセル手数料
        + forcibly: 1000 (boolean, required) - キャンセル対象に対するバリデーションを無効にするかどうか(trueの場合、無効)

+ Response 201 (application/json)
    + Attributes
        + id: `59119065e3157c1884d3c333` (string, required) - 返品取引ID

<!-- include(../response/400.md) -->
<!-- include(../response/404.md) -->
<!-- include(../response/409.md) -->
