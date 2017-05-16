
## 本予約 [/reservations/confirm]

### 本予約 [POST]
仮予約IDリストから予約を確定する

+ Request (application/json)
    + Attributes
        + ids: (array[string], fixed_type)
            + 123456789 (string) - 予約ID
        + payment_method: 0 - 決済方法

+ Response 200 (application/json)
    + Attributes
        + data (array[object], fixed-type) - 予約リスト
            + (object) - 予約オブジェクト
                + type: reservations (string) - リソースタイプ
                + id: 123456789 (string) - 予約ID
                + attributes (object) - 属性
                    + seat_code: `A-1` - 座席番号
                    + payment_no: 12345 - 購入番号
                    + qr_str: 123456789 - 座席入場QRコード

<!-- include(../response/400.md) -->
