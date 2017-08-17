/**
 * expressアプリケーション
 *
 * @module app
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as bodyParser from 'body-parser';
import * as createDebug from 'debug';
import * as express from 'express';
import expressValidator = require('express-validator'); // tslint:disable-line:no-require-imports
import * as helmet from 'helmet';
import * as i18n from 'i18n';

import mongooseConnectionOptions from '../mongooseConnectionOptions';

import benchmarks from './middlewares/benchmarks';

import errorHandler from './middlewares/errorHandler';
import notFoundHandler from './middlewares/notFoundHandler';

import devRouter from './routes/dev';
import oAuthRouter from './routes/oAuth';
import performanceRouter from './routes/performances';
import reservationRouter from './routes/reservations';
import router from './routes/router';
import screenRouter from './routes/screens';
import transactionRouter from './routes/transactions';

const debug = createDebug('ttts-api:app');

const app = express();
var cors = require('cors')

app.use(cors());

app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ['\'self\'']
        // styleSrc: ['\'unsafe-inline\'']
    }
}));
app.use((<any>helmet).referrerPolicy({ policy: 'no-referrer' })); // 型定義が非対応のためany
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

app.use(benchmarks); // ベンチマーク的な

// view engine setup
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

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
app.use('/oauth', oAuthRouter);
app.use('/', router);
app.use('/performances', performanceRouter);
app.use('/reservations', reservationRouter);
app.use('/screens', screenRouter);
app.use('/transactions', transactionRouter);

if (process.env.NODE_ENV !== 'production') {
    app.use('/dev', devRouter);
}

// 404
app.use(notFoundHandler);

// error handlers
app.use(errorHandler);

// @types/mongooseが古くて、新しいMongoDBクライアントの接続オプションに適合していない
// 型定義の更新待ち
ttts.mongoose.connect(<string>process.env.MONGOLAB_URI, <any>mongooseConnectionOptions);

export = app;
