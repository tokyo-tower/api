# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased
### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security


## v5.4.2 - 2018-02-02
### Fixed
- 購入者情報として日本以外の国の電話番号が登録できないバグを修正。
- 同じ上演日で購入番号が重複するバグを修正。

## v5.4.1 - 2018-01-19
### Changed
- 注文取引開始時にstaffアプリケーションに関しては特別に許可証を非必須化(一時的な対応)

## v5.4.0 - 2018-01-19
### Changed
- 注文取引開始時のWAITER許可証を必須化。

## v5.3.0 - 2018-01-17
### Changed
- 予約の属性に在庫情報リストを追加。

## v5.2.1 - 2018-01-15
### Changed
- GMOオーソリタイムアウトハンドリングを調整。

## v5.2.0 - 2018-01-11
### Changed
- 管理者トークンエンドポイントにクライアントによるベーシック認証を追加。
- イベント検索のパフォーマンス向上。

## v5.1.0 - 2018-01-10
### Added
- 管理者トークン発行エンドポイントを追加。
- 管理者エンドポイントを追加。

## v5.0.0 - 2018-01-10
### Added
- クライアント認証の仕組みを実装。
- 許可スコープチェックの仕組みを実装。
- 取引ルーターを追加。
- 座席仮予約エンドポイントを追加。
- 座席仮予約解除エンドポイントを追加。
- 座席本予約エンドポイントを追加。
- 座席本予約取消エンドポイントを追加。
- IDでパフォーマンス検索のエンドポイントを追加。
- 識別子で企業組織検索のエンドポイントを追加。
- 注文照会エンドポイントを追加。
- 入場(取消)エンドポイントを追加。
- 予約検索エンドポイントを追加。

### Changed
- パフォーマンス検索のレスポンスを多言語化。
- HTTPステータスコードの振り分けをルーターに記述するように統一。
- ttts-domain@12.0.0に対応。
- APIの認証情報をCognitoから取得するように変更。
- パフォーマンス検索結果の券種情報を強化。在庫状況情報も強化。
- multi issuer対応。
- 取引にAPIクライアント情報を結合。
- 返品確定サービスを購入者区分に関わらず汎用化。
- 注文取引確定のレスポンスに属性追加。

### Removed
- configパッケージを削除。環境依存変数を全てprocess.envへ移行。
- 不要なルーターを削除。

### Security
- update package [tslint@5.8.0](https://www.npmjs.com/package/tslint)
- update package [typescript@2.6.2](https://www.npmjs.com/package/typescript)

## v4.0.0 - 2017-05-05
### Added
- chevreを継承してリリース。
