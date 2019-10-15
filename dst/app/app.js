"use strict";
/**
 * expressアプリケーション
 */
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const expressValidator = require("express-validator");
const helmet = require("helmet");
const connectMongo_1 = require("../connectMongo");
const errorHandler_1 = require("./middlewares/errorHandler");
const notFoundHandler_1 = require("./middlewares/notFoundHandler");
const admins_1 = require("./routes/admins");
const aggregateSales_1 = require("./routes/aggregateSales");
const events_1 = require("./routes/events");
const health_1 = require("./routes/health");
// import iamRouter from './routes/iam';
const oauth_1 = require("./routes/oauth");
// import ordersRouter from './routes/orders';
const organizations_1 = require("./routes/organizations");
const performances_1 = require("./routes/performances");
const preview_1 = require("./routes/preview");
// import projectsRouter from './routes/projects';
const reservations_1 = require("./routes/reservations");
// import sellersRouter from './routes/sellers';
const stats_1 = require("./routes/stats");
const tasks_1 = require("./routes/tasks");
const placeOrder_1 = require("./routes/transactions/placeOrder");
const returnOrder_1 = require("./routes/transactions/returnOrder");
// import userPoolsRouter from './routes/userPools';
const webhooks_1 = require("./routes/webhooks");
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
app.use(bodyParser.json({ limit: '50mb' }));
// The extended option allows to choose between parsing the URL-encoded data
// with the querystring library (when false) or the qs library (when true).
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(expressValidator({})); // this line must be immediately after any of the bodyParser middlewares!
// ルーティング
app.use('/admins', admins_1.default);
app.use('/aggregateSales', aggregateSales_1.default);
app.use('/events', events_1.default);
app.use('/health', health_1.default);
// app.use('/iam', iamRouter);
app.use('/oauth', oauth_1.default);
// app.use('/orders', ordersRouter);
app.use('/organizations', organizations_1.default);
app.use('/preview', preview_1.default);
app.use('/performances', performances_1.default);
// app.use('/projects', projectsRouter);
app.use('/reservations', reservations_1.default);
// app.use('/sellers', sellersRouter);
app.use('/stats', stats_1.default);
app.use('/tasks', tasks_1.default);
app.use('/transactions/placeOrder', placeOrder_1.default);
app.use('/transactions/returnOrder', returnOrder_1.default);
// app.use('/userPools', userPoolsRouter);
app.use('/webhooks', webhooks_1.default);
// 404
app.use(notFoundHandler_1.default);
// error handlers
app.use(errorHandler_1.default);
connectMongo_1.connectMongo({ defaultConnection: true })
    .then()
    .catch((err) => {
    // tslint:disable-next-line:no-console
    console.error('connetMongo:', err);
    process.exit(1);
});
module.exports = app;
