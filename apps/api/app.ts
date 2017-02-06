import express = require('express');
import bodyParser = require('body-parser');
import logger from './middlewares/logger';
import benchmarks from './middlewares/benchmarks';
import conf = require('config');
import mongoose = require('mongoose');
import i18n = require('i18n');
import passport = require('passport');
import passportHttpBearer = require('passport-http-bearer');
let BearerStrategy = passportHttpBearer.Strategy;
import {Models} from "@motionpicture/ttts-domain";

passport.use(new BearerStrategy(
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

let app = express();

if (process.env.NODE_ENV === 'dev') {
    app.use(logger); // ロガー
}

if (process.env.NODE_ENV !== 'prod') {
    // サーバーエラーテスト
    app.get('/api/500', (req) => {
        // req.on('data', (chunk) => {
        // });

        req.on('end', () => {
            throw new Error('500 manually.');
        })
    });

    app.get('/api/disconnect', (req, res) => {
        console.log("ip:", req.ip);
        mongoose.disconnect((err: any) => {
            res.send('disconnected.' + err.toString());
        });
    });

    app.get('/api/connect', (req, res) => {
        console.log("ip:", req.ip);
        mongoose.connect(MONGOLAB_URI, (err) => {
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

// for parsing multipart/form-data
// let storage = multer.memoryStorage()
// app.use(multer({ storage: storage }).any());

// app.use(cookieParser());





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
app.use("/", router);


let MONGOLAB_URI = conf.get<string>('mongolab_uri');

// Use native promises
mongoose.Promise = global.Promise;
mongoose.connect(MONGOLAB_URI, {});





if (process.env.NODE_ENV !== 'prod') {
    let db = mongoose.connection;
    db.on('connecting', function() {
        console.log('connecting');
    });
    db.on('error', function(error: any) {
        console.error('Error in MongoDb connection: ', error);
    });
    db.on('connected', function() {
        console.log('connected.');
    });
    db.once('open', function() {
        console.log('connection open.');
    });
    db.on('reconnected', function () {
        console.log('reconnected.');
    });
    db.on('disconnected', function() {
        console.log('disconnected.');
    });
}



export = app;
