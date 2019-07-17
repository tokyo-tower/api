/**
 * expressアプリケーション
 */
import * as ttts from '@tokyotower/domain';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as express from 'express';
import * as expressValidator from 'express-validator';
import * as helmet from 'helmet';

import mongooseConnectionOptions from '../mongooseConnectionOptions';

import errorHandler from './middlewares/errorHandler';
import notFoundHandler from './middlewares/notFoundHandler';

import adminsRouter from './routes/admins';
import devRouter from './routes/dev';
import eventsRouter from './routes/events';
import healthRouter from './routes/health';
import iamRouter from './routes/iam';
import oauthRouter from './routes/oauth';
import ordersRouter from './routes/orders';
import organizationsRouter from './routes/organizations';
import performanceRouter from './routes/performances';
import previewRouter from './routes/preview';
import projectsRouter from './routes/projects';
import reservationsRouter from './routes/reservations';
import sellersRouter from './routes/sellers';
import statsRouter from './routes/stats';
import tasksRouter from './routes/tasks';
import placeOrderTransactionsRouter from './routes/transactions/placeOrder';
import returnOrderTransactionsRouter from './routes/transactions/returnOrder';
import userPoolsRouter from './routes/userPools';

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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator({})); // this line must be immediately after any of the bodyParser middlewares!

// ルーティング
app.use('/admins', adminsRouter);
app.use('/events', eventsRouter);
app.use('/health', healthRouter);
app.use('/iam', iamRouter);
app.use('/oauth', oauthRouter);
app.use('/orders', ordersRouter);
app.use('/organizations', organizationsRouter);
app.use('/preview', previewRouter);
app.use('/performances', performanceRouter);
app.use('/projects', projectsRouter);
app.use('/reservations', reservationsRouter);
app.use('/sellers', sellersRouter);
app.use('/stats', statsRouter);
app.use('/tasks', tasksRouter);
app.use('/transactions/placeOrder', placeOrderTransactionsRouter);
app.use('/transactions/returnOrder', returnOrderTransactionsRouter);
app.use('/userPools', userPoolsRouter);

if (process.env.NODE_ENV !== 'production') {
    app.use('/dev', devRouter);
}

// 404
app.use(notFoundHandler);

// error handlers
app.use(errorHandler);

ttts.mongoose.connect(<string>process.env.MONGOLAB_URI, mongooseConnectionOptions)
    .then()
    // tslint:disable-next-line:no-console
    .catch(console.error);

export = app;
