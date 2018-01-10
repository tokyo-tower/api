/**
 * orders router
 * @module ordersRouter
 */

import * as ttts from '@motionpicture/ttts-domain';
import { Router } from 'express';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

// 車椅子レート制限のためのRedis接続クライアント
const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

const ordersRouter = Router();
ordersRouter.use(authentication);

/**
 * make inquiry of an order
 */
ordersRouter.post(
    '/findByOrderInquiryKey',
    permitScopes(['orders', 'orders.read-only']),
    (req, _, next) => {
        req.checkBody('performanceDay', 'invalid performanceDay').notEmpty().withMessage('performanceDay is required');
        req.checkBody('paymentNo', 'invalid paymentNo').notEmpty().withMessage('paymentNo is required');
        req.checkBody('telephone', 'invalid telephone').notEmpty().withMessage('telephone is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const key = {
                performanceDay: req.body.performanceDay,
                paymentNo: req.body.paymentNo,
                telephone: req.body.telephone
            };

            const repository = new ttts.repository.Order(ttts.mongoose.connection);
            const order = await repository.findByOrderInquiryKey(key);

            // バウチャー印刷トークンを発行
            const tokenRepo = new ttts.repository.Token(redisClient);
            const reservationIds = order.acceptedOffers
                .filter((o) => o.itemOffered.status === ttts.factory.reservationStatusType.ReservationConfirmed)
                .map((o) => o.itemOffered.id);
            const printToken = await tokenRepo.createPrintToken(reservationIds);

            res.json({
                ...order,
                printToken: printToken
            });
        } catch (error) {
            next(error);
        }
    }
);

export default ordersRouter;
