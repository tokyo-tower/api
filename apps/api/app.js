"use strict";
/**
 * expressアプリケーション
 *
 * @module app
 */
const bodyParser = require("body-parser");
const conf = require("config");
const express = require("express");
const i18n = require("i18n");
const mongoose = require("mongoose");
const passport = require("passport");
const passportHttpBearer = require("passport-http-bearer");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const benchmarks_1 = require("./middlewares/benchmarks");
const cors_1 = require("./middlewares/cors");
const logger_1 = require("./middlewares/logger");
const bearerStrategy = passportHttpBearer.Strategy;
const MONGOLAB_URI = conf.get('mongolab_uri');
passport.use(new bearerStrategy((token, cb) => {
    ttts_domain_1.Models.Authentication.findOne({
        token: token
    }, (err, authentication) => {
        if (err)
            return cb(err);
        if (!authentication)
            return cb(null, false);
        cb(null, authentication);
    });
}));
const app = express();
app.use(cors_1.default);
if (process.env.NODE_ENV === 'dev') {
    app.use(logger_1.default); // ロガー
}
if (process.env.NODE_ENV !== 'prod') {
    // サーバーエラーテスト
    app.get('/api/500', (req) => {
        // req.on('data', (chunk) => {
        // });
        req.on('end', () => {
            throw new Error('500 manually.');
        });
    });
    app.get('/api/disconnect', (req, res) => {
        console.log('ip:', req.ip);
        mongoose.disconnect((err) => {
            res.send('disconnected.' + err.toString());
        });
    });
    app.get('/api/connect', (req, res) => {
        console.log('ip:', req.ip);
        mongoose.connect(MONGOLAB_URI, (err) => {
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
    directory: __dirname + '/../../locales',
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
if (process.env.NODE_ENV !== 'prod') {
    const db = mongoose.connection;
    db.on('connecting', () => {
        console.log('connecting');
    });
    db.on('error', (error) => {
        console.error('Error in MongoDb connection: ', error);
    });
    db.on('connected', () => {
        console.log('connected.');
    });
    db.once('open', () => {
        console.log('connection open.');
    });
    db.on('reconnected', () => {
        console.log('reconnected.');
    });
    db.on('disconnected', () => {
        console.log('disconnected.');
    });
}
module.exports = app;
