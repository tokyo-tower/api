# 東京タワーチケット予約システムAPIアプリケーション

# Getting Started

### Environment variables

| Name           | Required | Value      | Purpose                |
| -------------- | -------- | ---------- | ---------------------- |
| `DEBUG`        | false    | ttts-api:* | Debug                  |
| `NPM_TOKEN`    | true     |            | NPM auth token         |
| `NODE_ENV`     | true     |            | environment name       |
| `MONGOLAB_URI` | true     |            | MongoDB connection URI |
| `REDIS_HOST`   | true     |            | redis host             |
| `REDIS_PORT`   | true     |            | redis port             |
| `REDIS_KEY`    | true     |            | redis key              |

## tslint

コード品質チェックをtslintで行う。
* [tslint](https://github.com/palantir/tslint)
* [tslint-microsoft-contrib](https://github.com/Microsoft/tslint-microsoft-contrib)

`npm run check`でチェック実行。


## パッケージ脆弱性のチェック

* [nsp](https://www.npmjs.com/package/nsp)


## clean
`npm run clean`で不要なソース削除。


## テスト
`npm test`でテスト実行。


## ドキュメント
`npm run doc`でjsdocが作成されます。
