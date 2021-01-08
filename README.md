# TTTS API Application

[![CircleCI](https://circleci.com/gh/tokyo-tower/api.svg?style=svg)](https://circleci.com/gh/tokyo-tower/api)

## Table of contents

* [Usage](#usage)
* [License](#license)

## Usage

### Environment variables

| Name                          | Required | Value      | Purpose                        |
| ----------------------------- | -------- | ---------- | ------------------------------ |
| `DEBUG`                       | false    | ttts-api:* | Debug                          |
| `MONGOLAB_URI`                | true     |            | MongoDB connection URI         |
| `PROJECT_ID`                  | true     |            | Project ID                     |
| `REDIS_HOST`                  | true     |            | redis host                     |
| `REDIS_PORT`                  | true     |            | redis port                     |
| `REDIS_KEY`                   | true     |            | redis key                      |
| `RESOURECE_SERVER_IDENTIFIER` | true     |            | Resource Server Identifier     |
| `TOKEN_ISSUERS`               | true     |            | Token issuers(Comma separated) |

## License

ISC
