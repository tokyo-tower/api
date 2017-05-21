# Group OAuth

## Issue an access token [/oauth/token]

### アクセストークン発行 [POST]
[OAuth2](https://tools.ietf.org/html/rfc6749) に準拠したトークンエンドポイントです。

**利用可能な認可タイプ**

+ `client_credentials`

認証時には必要なスコープを必ず指定してください。

**利用可能なスコープ**
| scope                              | description
| :--------------------------------- | :--------------------------------- 
| transactions                       | 座席予約取引処理
| performances.readonly              | パフォーマンス読み込み

::: note
返却値には、`access_token`と`expires_in`が含まれます。

アプリケーション側でアクセストークンの有効期間を管理し、適宜再取得してください。
:::

+ Request クライアント認証 (application/json)
    + Attributes
        + `grant_type`: `client_credintials` (string, required) - 認証タイプ(固定値)
        + `client_id`: `motionpicture` (string, required)
            クライアントID(api利用時にmotionpictureが発行するのでアプリケーション側で大切に保管してください)
        + `client_secret`: `motionpicture` (string, required)
            クライアントシークレット(api利用時にmotionpictureが発行するのでアプリケーション側で大切に保管してください)
        + `scope` (array, fixed-type, required) - 必要なスコープは、各APIの説明を参照してください。
            + `transactions` (string)
            + `performances.readonly` (string)

+ Response 200 (application/json)
    + Attributes
        + access_token: `JWT` (string, required) - アクセストークン
        + token_type: `Bearer` (string, required) - 発行されたトークンタイプ
        + expires_in: 1800 (number, required) - アクセストークンの有効期間

<!-- include(../response/400.md) -->
