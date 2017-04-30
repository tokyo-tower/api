"use strict";
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
const benchmarks_1 = require("./middlewares/benchmarks");
const cors_1 = require("./middlewares/cors");
const debug = createDebug('chevre-api:app');
const app = express();
app.use(cors_1.default);
if (process.env.NODE_ENV !== 'production') {
    // サーバーエラーテスト
    app.get('/dev/uncaughtexception', (req) => {
        req.on('data', (chunk) => {
            debug(chunk);
        });
        req.on('end', () => {
            throw new Error('uncaughtexception manually');
        });
    });
    app.get('/api/disconnect', (_, res) => {
        mongoose.disconnect((err) => {
            res.send('disconnected.' + err.toString());
        });
    });
    app.get('/api/connect', (_, res) => {
        mongoose.connect(process.env.MONGOLAB_URI, {}, (err) => {
            res.send('connected.' + err.toString());
        });
    });
}
app.use(benchmarks_1.default); // ベンチマーク的な
// view engine setup
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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
mongoose.connect(process.env.MONGOLAB_URI, {});
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
