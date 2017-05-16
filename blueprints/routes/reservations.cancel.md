
## 本予約取消 [/reservations/cancel]

### 本予約取消 [POST]
上映日と購入番号から本予約を取り消す

+ Request (application/json)
    + Attributes
        + performance_day: 20170511 (string, required) - 上映日
        + payment_no: 12345 (string, required) - 購入番号

+ Response 204

<!-- include(../response/404.md) -->

<!-- include(../response/400.md) -->
