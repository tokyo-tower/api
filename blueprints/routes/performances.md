# Data Structure

## MultilingualString
+ en: `english name` (string, optional) - 英語名称
+ ja: `日本語名称` (string, optional) - 日本語名称
+ kr: `한국어 명칭` (string, optional) - 韓国語名称

## Performance
+ type: `performances` (string) - リソースタイプ
+ id: `59119065e3157c1884d3c333` (string) - パフォーマンスID
+ atrributes (object)
    + day: `20171025` (string) - 上映日
    + open_time: `1210` (string) - 開場時刻
    + start_time: `1230` (string) - 開演時刻
    + seat_status: `◎` (string) - 空席状況
    + theater_name: (MultilingualString) - 劇場名称
    + screen_name: (MultilingualString) - スクリーン名称
    + film: `000004` (string) - 作品ID
    + film_name: (MultilingualString) - 作品名称
    + film_minutes: `98` (number) - 作品上映時間
    + film_copyright: `©2016「いきなり先生」製作委員会` (string) - 作品コピーライト



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
条件指定でパフォーマンスを検索します

example:
```no-highlight
/performances?theater=001&limit=5
```

+ Response 200 (application/json)
    + Attributes
        + data (array[Performance], fixed-type) - パフォーマンスリスト
            + (Performance)
            + (Performance)

<!-- include(../response/400.md) -->
