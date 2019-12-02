/**
 * expressアプリケーション
 */
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import * as expressValidator from 'express-validator';
import * as helmet from 'helmet';

import { connectMongo } from '../connectMongo';

import errorHandler from './middlewares/errorHandler';
import notFoundHandler from './middlewares/notFoundHandler';

import adminsRouter from './routes/admins';
import aggregateSalesRouter from './routes/aggregateSales';
import healthRouter from './routes/health';
import oauthRouter from './routes/oauth';
import performanceRouter from './routes/performances';
import previewRouter from './routes/preview';
import reservationsRouter from './routes/reservations';
import statsRouter from './routes/stats';
import tasksRouter from './routes/tasks';
import ticketTypeCategoryRateLimitsRouter from './routes/ticketTypeCategoryRateLimit';
import placeOrderTransactionsRouter from './routes/transactions/placeOrder';
import returnOrderTransactionsRouter from './routes/transactions/returnOrder';
import webhooksRouter from './routes/webhooks';

const app = express();

const options: cors.CorsOptions = {
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
app.use((<any>helmet).referrerPolicy({ policy: 'no-referrer' })); // 型定義が非対応のためany
const SIXTY_DAYS_IN_SECONDS = 5184000;
app.use(helmet.hsts({
    maxAge: SIXTY_DAYS_IN_SECONDS,
    includeSubdomains: false
}));

// api version
// tslint:disable-next-line:no-require-imports no-var-requires
const packageInfo = require('../../package.json');
app.use((__, res, next) => {
    res.setHeader('x-api-version', <string>packageInfo.version);
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
app.use('/admins', adminsRouter);
app.use('/aggregateSales', aggregateSalesRouter);
app.use('/health', healthRouter);
app.use('/oauth', oauthRouter);
app.use('/preview', previewRouter);
app.use('/performances', performanceRouter);
app.use('/reservations', reservationsRouter);
app.use('/stats', statsRouter);
app.use('/tasks', tasksRouter);
app.use('/ticketTypeCategoryRateLimits', ticketTypeCategoryRateLimitsRouter);
app.use('/transactions/placeOrder', placeOrderTransactionsRouter);
app.use('/transactions/returnOrder', returnOrderTransactionsRouter);
app.use('/webhooks', webhooksRouter);

// 404
app.use(notFoundHandler);

// error handlers
app.use(errorHandler);

connectMongo({ defaultConnection: true })
    .then()
    .catch((err) => {
        // tslint:disable-next-line:no-console
        console.error('connetMongo:', err);
        process.exit(1);
    });

export = app;
