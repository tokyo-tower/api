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
        + data (array[object], fixed-type) - パフォーマンスリスト
            + (object) - パフォーマンスオブジェクト
                + type: `performances` (string) - リソースタイプ
                + id: `59119065e3157c1884d3c333` (string) - パフォーマンスID
                + atrributes (object) - 属性
                    + day: `20171025` (string) 上映日
                    + open_time: `1210` (string) 開場時刻
                    + start_time: `1230` (string) 開演時刻
                    + seat_status: `◎` (string) 座席コード
                    + theater_name: `TOHOシネマズ 六本木ヒルズ` (string) 劇場名
                    + screen_name: `スクリーン 2` (string) スクリーン名
                    + film: `000004` (string) 作品ID
                    + film_name: `いきなり先生になったボクが彼女に恋をした` (string) 作品名
                    + film_minutes: `98` (number) 作品上映時間
                    + film_copyright: `©2016「いきなり先生」製作委員会` (string) 作品コピーライト
            + (object) - パフォーマンスオブジェクト
                + type: `performances` (string) - リソースタイプ
                + id: `111112` (string) - パフォーマンスID
                + atrributes (object) - 属性
                    + day: `20171025` (string) 上映日
                    + open_time: `1210` (string) 開場時刻
                    + start_time: `1230` (string) 開演時刻
                    + seat_status: `◎` (string) 座席コード
                    + theater_name: `TOHOシネマズ 六本木ヒルズ` (string) 劇場名
                    + screen_name: `スクリーン 2` (string) スクリーン名
                    + film: `000004` (string) 作品ID
                    + film_name: `いきなり先生になったボクが彼女に恋をした` (string) 作品名
                    + film_minutes: `98` (number) 作品上映時間
                    + film_copyright: `©2016「いきなり先生」製作委員会` (string) 作品コピーライト

<!-- include(../response/400.md) -->
