# 東京タワーチケット予約システムAPIアプリケーション

[![CircleCI](https://circleci.com/gh/motionpicture/ttts-api.svg?style=svg)](https://circleci.com/gh/motionpicture/ttts-api)

## Table of contents

* [Usage](#usage)
* [Code Samples](#code-samples)
* [License](#license)

## Usage

### Environment variables

| Name                             | Required | Value      | Purpose                                        |
| -------------------------------- | -------- | ---------- | ---------------------------------------------- |
| `DEBUG`                          | false    | ttts-api:* | Debug                                          |
| `NODE_ENV`                       | true     |            | environment name                               |
| `MONGOLAB_URI`                   | true     |            | MongoDB connection URI                         |
| `REDIS_HOST`                     | true     |            | redis host                                     |
| `REDIS_PORT`                     | true     |            | redis port                                     |
| `REDIS_KEY`                      | true     |            | redis key                                      |
| `RESOURECE_SERVER_IDENTIFIER`    | true     |            | リソースサーバー識別子                         |
| `TOKEN_ISSUERS`                  | true     |            | トークン発行者リスト(コンマつなぎ)             |
| `TTTS_TOKEN_SECRET`              | true     |            | 一時的なトークンを発行する際の検証シークレット |
| `ADMINS_USER_POOL_ID`            | true     |            | 管理者ユーザープールID                         |
| `AWS_ACCESS_KEY_ID`              | true     |            | AWSリソースアクセスキー                        |
| `AWS_SECRET_ACCESS_KEY`          | true     |            | AWSリソースアクセスシークレット                |
| `POS_CLIENT_ID`                  | true     |            | POSアプリクライアントID                        |
| `STAFF_CLIENT_ID`                | true     |            | 代理予約アプリクライアントID                   |
| `WAITER_SECRET`                  | true     |            | WAITER秘密鍵                                   |
| `WAITER_PASSPORT_ISSUER`         | true     |            | WAITER許可証発行者                             |
| `WAITER_DISABLED`                | true     | 1 or 0     | WAITER無効化フラグ                             |
| `CHEVRE_AUTHORIZE_SERVER_DOMAIN` | true     |            | Chevre API Settings                            |
| `CHEVRE_CLIENT_ID`               | true     |            | Chevre API Settings                            |
| `CHEVRE_CLIENT_SECRET`           | true     |            | Chevre API Settings                            |
| `CHEVRE_API_ENDPOINT`            | true     |            | Chevre API Settings                            |
| `PROJECT_ID`                     | true     |            | Project ID                                     |

## License

ISC
