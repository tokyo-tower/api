/**
 * 注文取引ルーター
 */
import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
// tslint:disable-next-line:no-submodule-imports
import { query } from 'express-validator/check';
import { CREATED, NO_CONTENT } from 'http-status';
// import * as https from 'https';
import * as moment from 'moment';
// tslint:disable-next-line:no-require-imports no-var-requires
// const httpsAgent = require('agentkeepalive').HttpsAgent;
// const agent = require('agentkeepalive');

const WAITER_DISABLED = process.env.WAITER_DISABLED === '1';

const placeOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

const debug = createDebug('ttts-api:placeOrderTransactionsRouter');

// 車椅子レート制限のためのRedis接続クライアント
const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

const creditService = new ttts.GMO.service.Credit(
    { endpoint: <string>process.env.GMO_ENDPOINT }
);

placeOrderTransactionsRouter.use(authentication);

placeOrderTransactionsRouter.post(
    '/start',
    permitScopes(['transactions']),
    (req, _, next) => {
        req.checkBody('expires', 'invalid expires')
            .notEmpty()
            .withMessage('expires is required')
            .isISO8601();
        req.checkBody('seller_identifier', 'invalid seller_identifier')
            .notEmpty()
            .withMessage('seller_identifier is required');

        // POSからの流入制限を一時的に回避するため、許可証不要なクライアント設定ができるようにする
        // staffアプリケーションに関しても同様に
        if (!WAITER_DISABLED
            && req.user.client_id !== <string>process.env.POS_CLIENT_ID
            && req.user.client_id !== <string>process.env.STAFF_CLIENT_ID) {
            req.checkBody('passportToken', 'invalid passportToken')
                .notEmpty()
                .withMessage('passportToken is required');
        }

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const transaction = await ttts.service.transaction.placeOrderInProgress.start({
                expires: moment(req.body.expires)
                    .toDate(),
                agent: {
                    ...req.agent,
                    identifier: [
                        ...(req.agent.identifier !== undefined) ? req.agent.identifier : [],
                        ...(req.body.agent !== undefined && req.body.agent.identifier !== undefined) ? req.body.agent.identifier : []
                    ]
                },
                sellerIdentifier: req.body.seller_identifier,
                clientUser: req.user,
                purchaserGroup: req.body.purchaser_group,
                passportToken: req.body.passportToken
            })(
                new ttts.repository.Transaction(ttts.mongoose.connection),
                new ttts.repository.Seller(ttts.mongoose.connection)
            );

            // tslint:disable-next-line:no-string-literal
            // const host = req.headers['host'];
            // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
            res.status(CREATED)
                .json(transaction);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put(
    '/:transactionId/customerContact',
    permitScopes(['transactions']),
    (req, _, next) => {
        req.checkBody('last_name')
            .notEmpty()
            .withMessage('required');
        req.checkBody('first_name')
            .notEmpty()
            .withMessage('required');
        req.checkBody('tel')
            .notEmpty()
            .withMessage('required');
        req.checkBody('email')
            .notEmpty()
            .withMessage('required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const contact = await ttts.service.transaction.placeOrderInProgress.setCustomerContact(
                req.user.sub,
                req.params.transactionId,
                {
                    ...req.body,
                    age: (req.body.age !== undefined) ? req.body.age : '',
                    address: (req.body.address !== undefined) ? req.body.address : '',
                    gender: (req.body.gender !== undefined) ? req.body.gender : ''
                }
            )(new ttts.repository.Transaction(ttts.mongoose.connection));

            res.status(CREATED)
                .json(contact);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/seatReservation',
    permitScopes(['transactions']),
    (__1, __2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            if (!Array.isArray(req.body.offers)) {
                req.body.offers = [];
            }

            const performanceId: string = req.body.performance_id;

            const action = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
                req.user.sub,
                req.params.transactionId,
                performanceId,
                (<any[]>req.body.offers).map((offer) => {
                    return {
                        ticket_type: offer.ticket_type,
                        watcher_name: offer.watcher_name
                    };
                })
            )(
                new ttts.repository.Transaction(ttts.mongoose.connection),
                new ttts.repository.Performance(ttts.mongoose.connection),
                new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection),
                new ttts.repository.PaymentNo(redisClient),
                new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
                new ttts.repository.Stock(redisClient),
                new ttts.repository.Task(ttts.mongoose.connection)
            );

            // 余分確保予約を除いてレスポンスを返す
            if (action.result !== undefined) {
                action.result.tmpReservations = action.result.tmpReservations.filter((r) => {
                    // 余分確保分を除く
                    let extraProperty: ttts.factory.propertyValue.IPropertyValue<string> | undefined;
                    if (r.additionalProperty !== undefined) {
                        extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
                    }

                    return r.additionalProperty === undefined
                        || extraProperty === undefined
                        || extraProperty.value !== '1';
                });
            }

            res.status(CREATED)
                .json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/seatReservation/:actionId',
    permitScopes(['transactions']),
    validator,
    async (req, res, next) => {
        try {
            await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(
                req.user.sub,
                req.params.transactionId,
                req.params.actionId
            )(
                new ttts.repository.Transaction(ttts.mongoose.connection),
                new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection),
                new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
                new ttts.repository.Stock(redisClient),
                new ttts.repository.Task(ttts.mongoose.connection)
            );

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/creditCard',
    permitScopes(['transactions']),
    (req, __2, next) => {
        req.checkBody('orderId', 'invalid orderId')
            .notEmpty()
            .withMessage('orderId is required');
        req.checkBody('amount', 'invalid amount')
            .notEmpty()
            .withMessage('amount is required');
        req.checkBody('method', 'invalid method')
            .notEmpty()
            .withMessage('gmo_order_id is required');
        req.checkBody('creditCard', 'invalid creditCard')
            .notEmpty()
            .withMessage('gmo_amount is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            // 会員IDを強制的にログイン中の人物IDに変更
            const creditCard: ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.ICreditCard4authorizeAction = {
                ...req.body.creditCard,
                ...{
                    memberId: (req.user.username !== undefined) ? req.user.sub : undefined
                }
            };
            debug('authorizing credit card...', creditCard);

            debug('authorizing credit card...', req.body.creditCard);
            const action = await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
                req.user.sub,
                req.params.transactionId,
                req.body.orderId,
                req.body.amount,
                req.body.method,
                creditCard
            )(
                new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection),
                new ttts.repository.Seller(ttts.mongoose.connection),
                new ttts.repository.Transaction(ttts.mongoose.connection),
                creditService
            );

            res.status(CREATED)
                .json({
                    id: action.id
                });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * クレジットカードオーソリ取消
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/creditCard/:actionId',
    permitScopes(['transactions']),
    validator,
    async (req, res, next) => {
        try {
            await ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
                req.user.sub,
                req.params.transactionId,
                req.params.actionId
            )(
                new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection),
                new ttts.repository.Transaction(ttts.mongoose.connection),
                creditService
            );

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/confirm',
    permitScopes(['transactions']),
    validator,
    async (req, res, next) => {
        try {
            const transactionResult = await ttts.service.transaction.placeOrderInProgress.confirm({
                agentId: req.user.sub,
                transactionId: req.params.transactionId,
                paymentMethod: req.body.payment_method
            })(
                new ttts.repository.Transaction(ttts.mongoose.connection),
                new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection),
                new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection),
                new ttts.repository.Token(redisClient),
                new ttts.repository.PaymentNo(redisClient)
            );
            debug('transaction confirmed.');

            // 余分確保予約を除いてレスポンスを返す
            if (transactionResult !== undefined) {
                transactionResult.order.acceptedOffers = transactionResult.order.acceptedOffers
                    .filter((o) => {
                        const r = o.itemOffered;
                        // 余分確保分を除く
                        let extraProperty: ttts.factory.propertyValue.IPropertyValue<string> | undefined;
                        if (r.additionalProperty !== undefined) {
                            extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
                        }

                        return r.additionalProperty === undefined
                            || extraProperty === undefined
                            || extraProperty.value !== '1';
                    });

                // POSへ互換性維持のためにeventReservations属性を生成
                (<any>transactionResult).eventReservations = transactionResult.order.acceptedOffers
                    .map((o) => {
                        const r = o.itemOffered;

                        return <any>{
                            qr_str: r.id,
                            payment_no: r.reservationNumber,
                            performance: r.reservationFor.id
                        };
                    });
            }

            res.status(CREATED)
                .json(transactionResult);
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/tasks/sendEmailNotification',
    permitScopes(['transactions']),
    (req, __2, next) => {
        req.checkBody('sender.name', 'invalid sender')
            .notEmpty()
            .withMessage('sender.name is required');
        req.checkBody('sender.email', 'invalid sender')
            .notEmpty()
            .withMessage('sender.email is required');
        req.checkBody('toRecipient.name', 'invalid toRecipient')
            .notEmpty()
            .withMessage('toRecipient.name is required');
        req.checkBody('toRecipient.email', 'invalid toRecipient')
            .notEmpty()
            .withMessage('toRecipient.email is required')
            .isEmail();
        req.checkBody('about', 'invalid about')
            .notEmpty()
            .withMessage('about is required');
        req.checkBody('text', 'invalid text')
            .notEmpty()
            .withMessage('text is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const task = await ttts.service.transaction.placeOrder.sendEmail(
                req.params.transactionId,
                {
                    sender: {
                        name: req.body.sender.name,
                        email: req.body.sender.email
                    },
                    toRecipient: {
                        name: req.body.toRecipient.name,
                        email: req.body.toRecipient.email
                    },
                    about: req.body.about,
                    text: req.body.text
                }
            )(
                new ttts.repository.Task(ttts.mongoose.connection),
                new ttts.repository.Transaction(ttts.mongoose.connection)
            );

            res.status(CREATED)
                .json(task);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引検索
 */
placeOrderTransactionsRouter.get(
    '',
    permitScopes(['admin']),
    ...[
        query('startFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('startThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('endFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('endThrough')
            .optional()
            .isISO8601()
            .toDate()
    ],
    validator,
    async (req, res, next) => {
        try {
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
            const searchConditions: ttts.factory.transaction.placeOrder.ISearchConditions = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
                sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: ttts.factory.sortType.Ascending },
                typeOf: ttts.factory.transactionType.PlaceOrder
            };
            const transactions = await transactionRepo.search(searchConditions);
            const totalCount = await transactionRepo.count(searchConditions);
            res.set('X-Total-Count', totalCount.toString());
            res.json(transactions);
        } catch (error) {
            next(error);
        }
    }
);

export default placeOrderTransactionsRouter;
