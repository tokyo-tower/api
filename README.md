# 東京タワーチケット予約システムAPIアプリケーション

# Getting Started

## Required environment variables
```shell
set NODE_ENV=**********環境名(development,test,productionなど)**********
set SENDGRID_API_KEY=**********sendgrid api key**********
set TTTS_PERFORMANCE_STATUSES_REDIS_HOST=**********パフォーマンス空席状況保管先redis host**********
set TTTS_PERFORMANCE_STATUSES_REDIS_PORT=**********パフォーマンス空席状況保管先redis port**********
set TTTS_PERFORMANCE_STATUSES_REDIS_KEY=**********パフォーマンス空席状況保管先redis key**********
set FRONTEND_ENDPOINT=**********frontendのエンドポイント**********
set MONGOLAB_URI=**********mongodb接続URI**********
set GMO_SITE_ID=**********gmo サイトID**********
set GMO_SHOP_ID=**********gmo ショップID**********
set GMO_SHOP_PASS=**********gmo ショップパスワード**********
set TTTS_API_SECRET=**********JWTに使用する鍵文字列**********
set OFFICIAL_WEBSITE_URL=**********オフィシャルウェブサイトURL**********
set EMAIL_FROM_ADDRESS=**********メール送信fromアドレス**********
set EMAIL_FROM_NAME=**********メール送信from名前**********
```

only on Aure WebApps

```shell
set WEBSITE_NODE_DEFAULT_VERSION=**********node.jsバージョン**********
set WEBSITE_TIME_ZONE=Tokyo Standard Time
```


# tslint

コード品質チェックをtslintで行っています。lintパッケージとして以下を仕様。
* [tslint](https://github.com/palantir/tslint)
* [tslint-microsoft-contrib](https://github.com/Microsoft/tslint-microsoft-contrib)
`npm run check`でチェック実行。改修の際には、必ずチェックすること。

# test
mochaフレームワークでテスト実行。
* [mocha](https://www.npmjs.com/package/mocha)
`npm test`でテスト実行。
