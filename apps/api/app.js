"use strict";
const express = require("express");
const bodyParser = require("body-parser");
const cors_1 = require("./middlewares/cors");
const logger_1 = require("./middlewares/logger");
const benchmarks_1 = require("./middlewares/benchmarks");
const conf = require("config");
const mongoose = require("mongoose");
const i18n = require("i18n");
const passport = require("passport");
const passportHttpBearer = require("passport-http-bearer");
let BearerStrategy = passportHttpBearer.Strategy;
const ttts_domain_1 = require("@motionpicture/ttts-domain");
passport.use(new BearerStrategy((token, cb) => {
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
let app = express();
app.use(cors_1.default);
if (process.env.NODE_ENV === 'dev') {
    app.use(logger_1.default);
}
if (process.env.NODE_ENV !== 'prod') {
    app.get('/api/500', (req) => {
        req.on('end', () => {
            throw new Error('500 manually.');
        });
    });
    app.get('/api/disconnect', (req, res) => {
        console.log("ip:", req.ip);
        mongoose.disconnect((err) => {
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
app.use(benchmarks_1.default);
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
i18n.configure({
    locales: ['en', 'ja'],
    defaultLocale: 'en',
    directory: __dirname + '/../../locales',
    objectNotation: true,
    updateFiles: false
});
app.use(i18n.init);
const router_1 = require("./routes/router");
app.use("/", router_1.default);
let MONGOLAB_URI = conf.get('mongolab_uri');
mongoose.Promise = global.Promise;
mongoose.connect(MONGOLAB_URI, {});
if (process.env.NODE_ENV !== 'prod') {
    let db = mongoose.connection;
    db.on('connecting', function () {
        console.log('connecting');
    });
    db.on('error', function (error) {
        console.error('Error in MongoDb connection: ', error);
    });
    db.on('connected', function () {
        console.log('connected.');
    });
    db.once('open', function () {
        console.log('connection open.');
    });
    db.on('reconnected', function () {
        console.log('reconnected.');
    });
    db.on('disconnected', function () {
        console.log('disconnected.');
    });
}
module.exports = app;
