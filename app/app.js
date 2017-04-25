"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * expressアプリケーション
 *
 * @module app
 */
const bodyParser = require("body-parser");
const createDebug = require("debug");
const express = require("express");
const i18n = require("i18n");
const mongoose = require("mongoose");
const passport = require("passport");
const passportHttpBearer = require("passport-http-bearer");
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const benchmarks_1 = require("./middlewares/benchmarks");
const cors_1 = require("./middlewares/cors");
const logger_1 = require("./middlewares/logger");
const debug = createDebug('chevre-api:app');
const bearerStrategy = passportHttpBearer.Strategy;
const MONGOLAB_URI = process.env.MONGOLAB_URI;
// oauth認証を使用する場合
passport.use(new bearerStrategy((token, cb) => __awaiter(this, void 0, void 0, function* () {
    try {
        const authentication = yield chevre_domain_1.Models.Authentication.findOne({ token: token }).exec();
        if (authentication === null) {
            cb(null, false);
            return;
        }
        cb(null, authentication);
    }
    catch (error) {
        cb(error);
    }
})));
const app = express();
app.use(cors_1.default);
if (process.env.NODE_ENV === 'development') {
    app.use(logger_1.default); // ロガー
}
if (process.env.NODE_ENV !== 'production') {
    // サーバーエラーテスト
    app.get('/dev/500', (req) => {
        // tslint:disable-next-line:no-empty
        req.on('data', () => {
        });
        req.on('end', () => {
            throw new Error('500 manually.');
        });
    });
    app.get('/api/disconnect', (_, res) => {
        mongoose.disconnect((err) => {
            res.send('disconnected.' + err.toString());
        });
    });
    app.get('/api/connect', (_, res) => {
        mongoose.connect(MONGOLAB_URI, {}, (err) => {
            res.send('connected.' + err.toString());
        });
    });
}
app.use(benchmarks_1.default); // ベンチマーク的な
// view engine setup
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// i18n を利用する設定
i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    directory: __dirname + '/../locales',
    objectNotation: true,
    updateFiles: false // ページのビューで自動的に言語ファイルを更新しない
});
// i18n の設定を有効化
app.use(i18n.init);
// ルーティング
const router_1 = require("./routes/router");
app.use('/', router_1.default);
// Use native promises
mongoose.Promise = global.Promise;
mongoose.connect(MONGOLAB_URI, {});
if (process.env.NODE_ENV !== 'production') {
    const db = mongoose.connection;
    db.on('connecting', () => {
        debug('connecting');
    });
    db.on('error', (error) => {
        console.error('Error in MongoDb connection: ', error);
    });
    db.on('connected', () => {
        debug('connected.');
    });
    db.once('open', () => {
        debug('connection open.');
    });
    db.on('reconnected', () => {
        debug('reconnected.');
    });
    db.on('disconnected', () => {
        debug('disconnected.');
    });
}
module.exports = app;
