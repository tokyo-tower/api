/**
 * expressアプリケーション
 *
 * @module app
 */
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as i18n from 'i18n';
import * as mongoose from 'mongoose';
import * as passport from 'passport';
import * as passportHttpBearer from 'passport-http-bearer';
import * as util from 'util';

import { Models } from '@motionpicture/chevre-domain';
import benchmarks from './middlewares/benchmarks';
import cors from './middlewares/cors';
import logger from './middlewares/logger';

const debug = util.debuglog('chevre-api:app');

const bearerStrategy = passportHttpBearer.Strategy;
const MONGOLAB_URI = process.env.MONGOLAB_URI;

passport.use(new bearerStrategy(
    (token, cb) => {
        Models.Authentication.findOne(
            {
                token: token
            },
            (err, authentication) => {
                if (err) return cb(err);
                if (!authentication) return cb(null, false);

                cb(null, authentication);
            }
        );
    }
));

const app = express();

app.use(cors);

if (process.env.NODE_ENV === 'development') {
    app.use(logger); // ロガー
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
        mongoose.disconnect((err: any) => {
            res.send('disconnected.' + err.toString());
        });
    });

    app.get('/api/connect', (_, res) => {
        mongoose.connect(MONGOLAB_URI, {}, (err) => {
            res.send('connected.' + err.toString());
        });
    });
}

app.use(benchmarks); // ベンチマーク的な

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
import router from './routes/router';
app.use('/', router);

// Use native promises
(<any>mongoose).Promise = global.Promise;
mongoose.connect(MONGOLAB_URI, {});

if (process.env.NODE_ENV !== 'production') {
    const db = mongoose.connection;
    db.on('connecting', () => {
        debug('connecting');
    });
    db.on('error', (error: any) => {
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

export = app;
