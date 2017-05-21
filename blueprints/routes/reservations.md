# Group Reservations

## 本予約 [/reservations/settle]

### 本予約 [POST]
仮予約IDリストから予約を確定する

**決済方法**
value                     | description
:------------------------ | :------------------------ 

**購入者区分**
value                     | description
:------------------------ | :------------------------ 
01                        | 一般
06                        | 窓口

**購入者性別**
value                     | description
:------------------------ | :------------------------ 

::: note
窓口購入の場合、購入者情報は固定値を渡してください。
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


## 本予約取消 [/reservations/cancel]

### 本予約取消 [POST]
上映日と購入番号から本予約を取り消す

+ Request (application/json)
    + Attributes
        + performance_day: `20170511` (string, required) - 上映日
        + payment_no: `1234567` (string, required) - 購入番号

+ Response 204

+ Response 404 (application/json)
    + Attributes (object)
        + data: null (object, nullable)

<!-- include(../response/400.md) -->
