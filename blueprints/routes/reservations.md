# Group Reservations

## 座席本予約取消 [/reservations/cancel]

### 座席本予約取消 [POST]
上映日と購入番号から本予約を取り消します。  
該当予約がない場合、ステータスコード404を返却します。

::: note
This action requires an `access_token` with `reservations` scope.
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
