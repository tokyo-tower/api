"use strict";
/**
 * expressアプリケーション
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
const admins_1 = require("./routes/admins");
const dev_1 = require("./routes/dev");
const health_1 = require("./routes/health");
const oauth_1 = require("./routes/oauth");
const orders_1 = require("./routes/orders");
const organizations_1 = require("./routes/organizations");
const performances_1 = require("./routes/performances");
const preview_1 = require("./routes/preview");
const reservations_1 = require("./routes/reservations");
const sellers_1 = require("./routes/sellers");
const stats_1 = require("./routes/stats");
const tasks_1 = require("./routes/tasks");
const placeOrder_1 = require("./routes/transactions/placeOrder");
const returnOrder_1 = require("./routes/transactions/returnOrder");
const userPools_1 = require("./routes/userPools");
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
// api version
// tslint:disable-next-line:no-require-imports no-var-requires
const packageInfo = require('../../package.json');
app.use((__, res, next) => {
    res.setHeader('x-api-version', packageInfo.version);
    next();
});
// view engine setup
// app.set('views', `${__dirname}/views`);
// app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator({})); // this line must be immediately after any of the bodyParser middlewares!
// ルーティング
app.use('/admins', admins_1.default);
app.use('/health', health_1.default);
app.use('/oauth', oauth_1.default);
app.use('/orders', orders_1.default);
app.use('/organizations', organizations_1.default);
app.use('/preview', preview_1.default);
app.use('/performances', performances_1.default);
app.use('/reservations', reservations_1.default);
app.use('/sellers', sellers_1.default);
app.use('/stats', stats_1.default);
app.use('/tasks', tasks_1.default);
app.use('/transactions/placeOrder', placeOrder_1.default);
app.use('/transactions/returnOrder', returnOrder_1.default);
app.use('/userPools', userPools_1.default);
if (process.env.NODE_ENV !== 'production') {
    app.use('/dev', dev_1.default);
}
// 404
app.use(notFoundHandler_1.default);
// error handlers
app.use(errorHandler_1.default);
ttts.mongoose.connect(process.env.MONGOLAB_URI, mongooseConnectionOptions_1.default);
module.exports = app;
