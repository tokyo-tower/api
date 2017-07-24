FORMAT: 1A
HOST: http://ttts-api-mock-development.ap-northeast-1.elasticbeanstalk.com

# 東京タワーチケットシステム api documentation

東京タワーチケットシステムが提供するapiは、チケットシステムデータとのやりとりを行うアプリケーション開発を可能にするためのものです。

基本仕様は以下に従っています。

[JSON API](http://jsonapi.org/)

[OAuth 2.0](https://oauth.net/2/)

[OAuth 2.0 Framework](http://tools.ietf.org/html/rfc6749)

## 共通仕様

### ステータスコード

status code               | description
:------------------------ | :------------------------
200 OK                    | リクエスト成功
400  OK                   | リクエストに問題があります。リクエストパラメータやJSONのフォーマットを確認してください。
401  OK                   | Authorizationヘッダを正しく送信していることを確認してください。
403  OK                   | APIの利用権限がありません。スコープを確認してください。
500  OK                   | APIサーバ側の一時的なエラーです。

### Error response

エラー時のresponse bodyは、以下のフィールドを持つJSONデータです。

field                     | type                      | description
:------------------------ | :------------------------ | :------------------------
errors                    | Array                     | エラーリスト
errors[].source           | Object                    | エラーの発生箇所
errors[].source.parameter | String                    | 問題のあるリクエストパラメータ名称
errors[].title            | String                    | エラーの概要
errors[].detail           | String                    | 詳細なエラー内容

あるいは

field                     | type                      | description
:------------------------ | :------------------------ | :------------------------
errors                    | Array                     | エラーリスト
errors[].title            | String                    | エラーの概要
errors[].detail           | String                    | 詳細なエラー内容



<!-- include(routes/oauth.md) -->

<!-- include(routes/performances.md) -->

<!-- include(routes/reservations.md) -->

<!-- include(routes/transactions.md) -->

<!-- include(routes/404.md) -->
