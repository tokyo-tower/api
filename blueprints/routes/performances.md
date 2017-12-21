# Data Structure

## Performances.MultilingualString
+ en: `english name` (string, optional) - 英語名称
+ ja: `日本語名称` (string, optional) - 日本語名称

## Performances.TicketType
+ charge: 1800 (number, required) - 価格
+ rate_limit_unit_in_seconds: 1 (number, required) - レート制限単位(秒)
+ name: (Performances.MultilingualString, required) - 券種名(多言語対応)
+ id: `001` (string, required) - 券種ID
+ available_num: 1 (number, required) - 在庫数

## Performances.Performance
+ id: `171222001001012130` (string, required) - パフォーマンスID
+ atrributes (object)
    + day: `20171025` (string, required) - 上映日(YYYYMMDD)
    + open_time: `1210` (string, required) - 開場時刻(hhmm)
    + start_time: `1210` (string, required) - 開場時刻(hhmm)
    + end_time: `1230` (string, required) - 開演時刻(hhmm)
    + seat_status: `35` (string, required) - 残席数
    + tour_number: `213` (string, required) - ツアーナンバー
    + wheelchair_available: 1 (number, required) - 車椅子残数
    + ticket_types (array[Performances.TicketType], fixed-type) - 券種リスト
    + online_sales_status: `Normal` (string, required) - 販売ステータス
    + refunded_count: 1 (number, required) - 返金済数
    + refund_status: `None` (string, required) - 返金ステータス
    + ev_service_status: `Normal` (string, required) - 停止ステータス



# Group Performances

## パフォーマンス検索 [/performances{?page,limit,theater,day}]

+ Parameters
    + page: `2` (number, optional) - ページ
      + Default: `1`
    + limit: `25` (number, optional) - 最大取得件数
      + Default: `100`
    + theater: `001` (string, optional) - 施設
    + day: `20110101` (string, optional) - 上映日

### パフォーマンス検索 [GET]
条件指定でパフォーマンスを検索します。

::: note
This action requires an `access_token` with `performances.read-only` scope.
:::

example:
```no-highlight
/performances?theater=001&limit=5
```

+ Response 200 (application/json)
    + Attributes
        + data: (array[Performances.Performance], fixed-type) - パフォーマンスリスト

<!-- include(../response/400.md) -->
