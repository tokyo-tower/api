/**
 * 注文取引ルーター
 * @ignore
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { CREATED, NO_CONTENT } from 'http-status';
import * as moment from 'moment';

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

placeOrderTransactionsRouter.use(authentication);

placeOrderTransactionsRouter.post(
    '/start',
    permitScopes(['transactions']),
    (req, _, next) => {
        req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required').isISO8601();
        req.checkBody('seller_identifier', 'invalid seller_identifier').notEmpty().withMessage('seller_identifier is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const transaction = await ttts.service.transaction.placeOrderInProgress.start({
                expires: moment(req.body.expires).toDate(),
                agentId: req.user.sub,
                sellerIdentifier: req.body.seller_identifier,
                purchaserGroup: req.body.purchaser_group
            })(
                new ttts.repository.Transaction(ttts.mongoose.connection),
                new ttts.repository.Organization(ttts.mongoose.connection),
                new ttts.repository.Owner(ttts.mongoose.connection)
                );

            // tslint:disable-next-line:no-string-literal
            // const host = req.headers['host'];
            // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
            res.status(CREATED).json(transaction);
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
        req.checkBody('last_name').notEmpty().withMessage('required');
        req.checkBody('first_name').notEmpty().withMessage('required');
        req.checkBody('tel').notEmpty().withMessage('required');
        req.checkBody('email').notEmpty().withMessage('required');
        req.checkBody('gender').notEmpty().withMessage('required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const contact = await ttts.service.transaction.placeOrderInProgress.setCustomerContact(
                req.user.sub,
                req.params.transactionId,
                {
                    last_name: req.body.last_name,
                    first_name: req.body.first_name,
                    email: req.body.email,
                    tel: req.body.tel,
                    age: '',
                    address: '',
                    gender: req.body.gender
                }
            )(new ttts.repository.Transaction(ttts.mongoose.connection));

            res.status(CREATED).json(contact);
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

            const action = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(
                req.user.sub,
                req.params.transactionId,
                req.body.perfomance_id,
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
                new ttts.repository.PaymentNo(ttts.mongoose.connection),
                new ttts.repository.rateLimit.TicketTypeCategory(redisClient)
                );

            res.status(CREATED).json(action);
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
                new ttts.repository.rateLimit.TicketTypeCategory(redisClient)
                );

            res.status(NO_CONTENT).end();
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
                new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection)
                );
            debug('transaction confirmed.', transactionResult);

            res.status(CREATED).json(transactionResult);
        } catch (error) {
            next(error);
        }
    }
);

export default placeOrderTransactionsRouter;
