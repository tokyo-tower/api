/**
 * 注文返品取引ルーター(POS専用)
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
import { CREATED } from 'http-status';
import * as moment from 'moment';

const ORDERS_KEY_PREFIX = 'orders:';

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

const auth = new cinerinoapi.auth.ClientCredentials({
    domain: '',
    clientId: '',
    clientSecret: '',
    scopes: [],
    state: ''
});

const returnOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

returnOrderTransactionsRouter.use(authentication);

/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post(
    '/confirm',
    permitScopes(['pos']),
    (req, _, next) => {
        req.checkBody('performance_day')
            .notEmpty()
            .withMessage('required');
        req.checkBody('payment_no')
            .notEmpty()
            .withMessage('required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            auth.setCredentials({ access_token: req.accessToken });
            const returnOrderService = new cinerinoapi.service.transaction.ReturnOrder({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT
            });
            // const returnOrderService = new cinerinoapi.service.transaction.ReturnOrder4ttts({
            //     auth: auth,
            //     endpoint: <string>process.env.CINERINO_API_ENDPOINT
            // });

            // 注文取得
            const confirmationNumber = `${req.body.performance_day}${req.body.payment_no}`;
            const key = `${ORDERS_KEY_PREFIX}${confirmationNumber}`;
            const order = await new Promise<cinerinoapi.factory.order.IOrder>((resolve, reject) => {
                redisClient.get(key, (err, result) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve(JSON.parse(result));
                    }
                });
            });

            const returnOrderTransaction = await returnOrderService.start({
                expires: moment()
                    .add(1, 'minute')
                    .toDate(),
                object: {
                    order: {
                        orderNumber: order.orderNumber,
                        customer: { telephone: order.customer.telephone }
                    }
                }
            });

            await returnOrderService.confirm({ id: returnOrderTransaction.id });

            // const returnOrderTransaction = await returnOrderService.confirm({
            //     performanceDay: req.body.performance_day,
            //     paymentNo: req.body.payment_no,
            //     cancellationFee: 0,
            //     reason: cinerinoapi.factory.transaction.returnOrder.Reason.Customer
            // });

            res.status(CREATED)
                .json({
                    id: returnOrderTransaction.id
                });
        } catch (error) {
            next(error);
        }
    }
);

export default returnOrderTransactionsRouter;
