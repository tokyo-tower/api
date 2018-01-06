# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased
### Added
- クライアント認証の仕組みを実装。
- 許可スコープチェックの仕組みを実装。
- 取引ルーターを追加。
- 座席仮予約エンドポイントを追加。
- 座席仮予約解除エンドポイントを追加。
- 座席本予約エンドポイントを追加。
- 座席本予約取消エンドポイントを追加。
- IDでパフォーマンス検索のエンドポイントを追加。

### Changed
- パフォーマンス検索のレスポンスを多言語化。
- HTTPステータスコードの振り分けをルーターに記述するように統一。
- ttts-domain@12.0.0に対応。
- APIの認証情報をCognitoから取得するように変更。
- パフォーマンス検索結果の券種情報を強化。在庫状況情報も強化。
- multi issuer対応。
- 取引にAPIクライアント情報を結合。
- 返品確定サービスを購入者区分に関わらず汎用化。

### Deprecated

### Removed
- configパッケージを削除。環境依存変数を全てprocess.envへ移行。
- 不要なルーターを削除。

### Fixed

### Security
- update package [tslint@5.5.0](https://www.npmjs.com/package/tslint)
- update package [typescript@2.4.2](https://www.npmjs.com/package/typescript)


## v4.0.0 - 2017-05-05
### Added
- chevreを継承してリリース。
