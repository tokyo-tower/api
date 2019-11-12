/**
 * 購入番号ルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
// tslint:disable-next-line:no-submodule-imports
import { body } from 'express-validator/check';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const paymentNosRouter = express.Router();

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

paymentNosRouter.use(authentication);

/**
 * イベント指定で購入番号を発行する
 */
paymentNosRouter.post(
    '/publish',
    permitScopes(['admin', 'pos', 'transactions']),
    ...[
        body('event.id')
            .not()
            .isEmpty()
            .withMessage(() => 'required')
            .isString()
    ],
    validator,
    async (req, res, next) => {
        try {
            const performanceRepo = new ttts.repository.Performance(mongoose.connection);
            const paymentNoRepo = new ttts.repository.PaymentNo(redisClient);

            const event = await performanceRepo.findById(<string>req.body.event.id);
            const eventStartDateStr = moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('YYYYMMDD');
            const paymentNo = await paymentNoRepo.publish(eventStartDateStr);

            res.json({ paymentNo });
        } catch (error) {
            next(error);
        }
    }
);

export default paymentNosRouter;
