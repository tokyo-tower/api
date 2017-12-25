# Data Structure

## Places.CheckinGate
+ identifier: `DAITEN_AUTH` - 入場ゲート識別子
+ name: `大展望台` - 入場ゲート名


# Group Places

## 入場ゲート [/preview/places/checkinGate]

### 入場ゲート検索 [GET]
入場ゲートを検索します。

+ Response 200 (application/json)
    + Attributes (array[Places.CheckinGate], fixed-type)
        + data: (Places.CheckinGate) - 入場ゲート情報

<!-- include(../response/400.md) -->
