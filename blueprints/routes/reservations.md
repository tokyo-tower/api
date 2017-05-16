# Group Reservations

## 本予約 [/reservations]

### 本予約 [POST]
仮予約IDリストから予約を確定する

+ Request (application/json)
    + Attributes
        + authorizations: (array[string], fixed_type)
            + `59119065e3157c1884d3c333` (string, required) - 仮予約ID
        + payment_method: `0` (string, required) - 決済方法

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


## 本予約取消 [/reservations/{performance_day}/{payment_no}]

+ Parameters
    + performance_day: `20170511` (string, required) - 上映日
    + payment_no: `1234567` (string, required) - 購入番号

### 本予約取消 [DELETE]
上映日と購入番号から本予約を取り消す

+ Response 204

+ Response 404 (application/json)
    + Attributes (object)
        + data: null (object, nullable)

<!-- include(../response/400.md) -->
