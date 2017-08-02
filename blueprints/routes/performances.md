# Data Structure

## Performances.MultilingualString
+ en: `english name` (string, optional) - 英語名称
+ ja: `日本語名称` (string, optional) - 日本語名称
+ kr: `한국어 명칭` (string, optional) - 韓国語名称

## Performances.Performance
+ type: `performances` (string, required) - リソースタイプ
+ id: `59119065e3157c1884d3c333` (string, required) - パフォーマンスID
+ atrributes (object)
    + day: `20171025` (string, required) - 上映日(YYYYMMDD)
    + start_time: `1210` (string, required) - 開場時刻(hhmm)
    + end_time: `1230` (string, required) - 開演時刻(hhmm)
    + seat_status: `◎` (string, required) - 空席状況(○×△ではない形に変更予定)
    + theater: `001` (string, required) - 劇場ID
    + theater_name: (Performances.MultilingualString, required) - 劇場名
    + screen: `00101` (string, required) - スクリーンID
    + screen_name: (Performances.MultilingualString, required) - スクリーン名
    + film: `000004` (string, required) - 作品ID
    + film_name: (Performances.MultilingualString, required) - 作品名
    + film_minutes: `98` (number, required) - 作品上映時間



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

::: note
検索条件と、レスポンスのatrributesについては、実際にapiを組み込むアプリケーションの都合によって、随時追加の可能性があります。
検索条件が足りない、あるいは、レスポンスの情報が足りない場合、api開発者へリクエストを投げてください。
:::

example:
```no-highlight
/performances?theater=001&limit=5
```

+ Response 200 (application/json)
    + Attributes
        + data (array[Performances.Performance], fixed-type) - パフォーマンスリスト

<!-- include(../response/400.md) -->
