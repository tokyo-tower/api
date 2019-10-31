# TTTS API Application

[![CircleCI](https://circleci.com/gh/tokyo-tower/api.svg?style=svg)](https://circleci.com/gh/tokyo-tower/api)

## Table of contents

* [Usage](#usage)
* [License](#license)

## Usage

### Environment variables

| Name                             | Required | Value      | Purpose                                        |
| -------------------------------- | -------- | ---------- | ---------------------------------------------- |
| `ADMINS_USER_POOL_ID`            | true     |            | Admin userpool ID                              |
| `AWS_ACCESS_KEY_ID`              | true     |            | AWS credentials                                |
| `AWS_SECRET_ACCESS_KEY`          | true     |            | AWS credentials                                |
| `CHEVRE_AUTHORIZE_SERVER_DOMAIN` | true     |            | Chevre API Settings                            |
| `CHEVRE_CLIENT_ID`               | true     |            | Chevre API Settings                            |
| `CHEVRE_CLIENT_SECRET`           | true     |            | Chevre API Settings                            |
| `CINERINO_API_AUTHORIZE_DOMAIN`  | true     |            | Cinerino API Settings                          |
| `CINERINO_API_ENDPOINT`          | true     |            | Cinerino API Settings                          |
| `COA_ENDPOINT`                   | true     |            | COA credentilas                                |
| `COA_REFRESH_TOKEN`              | true     |            | credentilas                                    |
| `CINERINO_API_ENDPOINT`          | true     |            | Cinerino API endpoint                          |
| `DEBUG`                          | false    | ttts-api:* | Debug                                          |
| `JOBS_STOPPED`                   | false    | 1 or 0     | Asynchronous jobs stopped flag                 |
| `LINE_NOTIFY_URL`                | true     |            | LINE Notify URL                                |
| `LINE_NOTIFY_ACCESS_TOKEN`       | true     |            | LINE Notify access token                       |
| `NODE_ENV`                       | true     |            | environment name                               |
| `MONGOLAB_URI`                   | true     |            | MongoDB connection URI                         |
| `PROJECT_ID`                     | true     |            | Project ID                                     |
| `REDIS_HOST`                     | true     |            | redis host                                     |
| `REDIS_PORT`                     | true     |            | redis port                                     |
| `REDIS_KEY`                      | true     |            | redis key                                      |
| `RESOURECE_SERVER_IDENTIFIER`    | true     |            | リソースサーバー識別子                         |
| `TOKEN_ISSUERS`                  | true     |            | トークン発行者リスト(コンマつなぎ)             |
| `TTTS_TOKEN_SECRET`              | true     |            | 一時的なトークンを発行する際の検証シークレット |
| `WAITER_ENDPOINT`                | true     |            | Waiter endpoint                                |

## License

ISC
