FORMAT: 1A
HOST: https://ttts-api-development.azurewebsites.net

# 東京タワーチケットシステム API documentation

東京タワーチケットシステムが提供するapiは、チケットシステムデータとのやりとりを行うアプリケーション開発を可能にするためのものです。

基本仕様は以下に従っています。

[JSON API](http://jsonapi.org/)

[OAuth 2.0](https://oauth.net/2/)

[OAuth 2.0 Framework](http://tools.ietf.org/html/rfc6749)

## 共通仕様

### ステータスコード

| status code               | description                                          |
| :------------------------ | :--------------------------------------------------- |
| 200 OK                    | リクエスト成功                                            |
| 400 BAD_REQUEST           | リクエストに問題があります。リクエストパラメータやJSONのフォーマットを確認してください。 |
| 401 UNAUTHORIZED          | Authorizationヘッダを正しく送信していることを確認してください。         |
| 403 FORBIDDEN             | APIの利用権限がありません。スコープを確認してください。                |
| 404 NOT_FOUND             | 指定したリソースが見つかりません。                                |
| 409 CONFLICT              | 指定したリソースにおいて競合が発生しました。                        |
| 429 TOO_MANY_REQUESTS     | レート制限を超過しました。時間をおいて再度アクセスしてください。           |
| 500 INTERNAL_SERVER_ERROR | APIサーバ側の一時的なエラーです。                              |
| 502 NOT_IMPLEMENTED       | 未実装エンドポイントです。                                    |
| 503 SERVICE_UNAVAILABLE   | APIサーバ側の一時的なエラーです。                              |

### Error response

エラー時のresponse bodyは、以下のフィールドを持つJSONデータです。

| field                  | type   | description  |
| :--------------------- | :----- | :----------- |
| error                  | Object | エラーオブジェクト    |
| error.code             | Array  | HTTPステータスコード |
| error.errors           | Array  | 詳細エラーリスト   |
| error.message          | Array  | エラーメッセージ     |
| error.errors[].message | Object | 詳細なエラー内容 |
| error.errors[].name    | String | エラー名称      |
| error.errors[].reason  | String | エラーの概要     |


<!-- include(routes/oauth.md) -->

<!-- include(routes/performances.md) -->

<!-- include(routes/transactions.md) -->

<!-- include(routes/404.md) -->
