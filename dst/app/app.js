"use strict";
/**
 * expressアプリケーション
 * @module app
 */
const ttts = require("@motionpicture/ttts-domain");
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const expressValidator = require("express-validator");
const helmet = require("helmet");
const mongooseConnectionOptions_1 = require("../mongooseConnectionOptions");
const errorHandler_1 = require("./middlewares/errorHandler");
const notFoundHandler_1 = require("./middlewares/notFoundHandler");
const dev_1 = require("./routes/dev");
const performances_1 = require("./routes/performances");
const reservations_1 = require("./routes/reservations");
const placeOrder_1 = require("./routes/transactions/placeOrder");
const returnOrder_1 = require("./routes/transactions/returnOrder");
const utils_1 = require("./routes/utils");
const app = express();
const options = {
    origin: '*',
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'X-Access-Token', 'Authorization'],
    credentials: true,
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204
};
// app.options('*', cors());
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
// view engine setup
// app.set('views', `${__dirname}/views`);
// app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator({})); // this line must be immediately after any of the bodyParser middlewares!
// ルーティング
app.use('/utils', utils_1.default);
app.use('/performances', performances_1.default);
app.use('/reservations', reservations_1.default);
app.use('/transactions/placeOrder', placeOrder_1.default);
app.use('/transactions/returnOrder', returnOrder_1.default);
if (process.env.NODE_ENV !== 'production') {
    app.use('/dev', dev_1.default);
}
// 404
app.use(notFoundHandler_1.default);
// error handlers
app.use(errorHandler_1.default);
ttts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
module.exports = app;
