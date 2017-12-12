"use strict";
/**
 * expressアプリケーション
 * @module app
 */
const ttts = require("@motionpicture/ttts-domain");
const bodyParser = require("body-parser");
const createDebug = require("debug");
const express = require("express");
const expressValidator = require("express-validator");
const helmet = require("helmet");
const i18n = require("i18n");
const mongooseConnectionOptions_1 = require("../mongooseConnectionOptions");
const errorHandler_1 = require("./middlewares/errorHandler");
const notFoundHandler_1 = require("./middlewares/notFoundHandler");
const dev_1 = require("./routes/dev");
const oauth_1 = require("./routes/oauth");
const performances_1 = require("./routes/performances");
const reservations_1 = require("./routes/reservations");
const router_1 = require("./routes/router");
const transactions_1 = require("./routes/transactions");
const debug = createDebug('ttts-api:app');
const app = express();
//var cors = require('cors')
const cors = require("cors");
const options = {
    origin: '*',
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'X-Access-Token', 'Authorization'],
    credentials: true,
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    preflightContinue: true
};
// app.options('*', cors())
app.use(cors(options));
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ['\'self\'']
        // styleSrc: ['\'unsafe-inline\'']
    }
}));
app.use(helmet.referrerPolicy({ policy: 'no-referrer' })); // 型定義が非対応のためany
const SIXTY_DAYS_IN_SECONDS = 5184000;
app.use(helmet.hsts({
    maxAge: SIXTY_DAYS_IN_SECONDS,
    includeSubdomains: false
}));
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
}
// view engine setup
// app.set('views', `${__dirname}/views`);
// app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator({})); // this line must be immediately after any of the bodyParser middlewares!
// i18n を利用する設定
i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    directory: `${__dirname}/../locales`,
    objectNotation: true,
    updateFiles: false // ページのビューで自動的に言語ファイルを更新しない
});
// i18n の設定を有効化
app.use(i18n.init);
// ルーティング
app.use('/oauth', oauth_1.default);
app.use('/', router_1.default);
app.use('/performances', performances_1.default);
app.use('/reservations', reservations_1.default);
app.use('/transactions', transactions_1.default);
if (process.env.NODE_ENV !== 'production') {
    app.use('/dev', dev_1.default);
}
// 404
app.use(notFoundHandler_1.default);
// error handlers
app.use(errorHandler_1.default);
ttts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
module.exports = app;
