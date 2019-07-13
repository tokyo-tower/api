/**
 * orders router
 */
import * as ttts from '@motionpicture/ttts-domain';
import { Router } from 'express';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

import { tttsReservation2chevre } from '../util/reservation';

const USE_NEW_ORDER_INQUIRY = process.env.USE_NEW_ORDER_INQUIRY === '1';

// 車椅子レート制限のためのRedis接続クライアント
const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

/**
 * 正規表現をエスケープする
 */
function escapeRegExp(params: string) {
    return params.replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
}

const ordersRouter = Router();
ordersRouter.use(authentication);

/**
 * make inquiry of an order
 */
ordersRouter.post(
    '/findByOrderInquiryKey',
    permitScopes(['orders', 'orders.read-only']),
    (req, _, next) => {
        req.checkBody('performanceDay', 'invalid performanceDay')
            .notEmpty()
            .withMessage('performanceDay is required');
        req.checkBody('paymentNo', 'invalid paymentNo')
            .notEmpty()
            .withMessage('paymentNo is required');
        req.checkBody('telephone', 'invalid telephone')
            .notEmpty()
            .withMessage('telephone is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const key: ttts.factory.order.IOrderInquiryKey = {
                performanceDay: <string>req.body.performanceDay,
                paymentNo: <string>req.body.paymentNo,
                telephone: <string>req.body.telephone
            };

            const orderRepo = new ttts.repository.Order(ttts.mongoose.connection);
            let order: ttts.factory.order.IOrder | undefined;

            if (USE_NEW_ORDER_INQUIRY) {
                const orders = await orderRepo.search({
                    limit: 1,
                    sort: { orderDate: ttts.factory.sortType.Descending },
                    customer: { telephone: `${escapeRegExp(key.telephone)}$` },
                    confirmationNumbers: [`${key.performanceDay}${key.paymentNo}`]
                });
                order = orders.shift();
                if (order === undefined) {
                    // まだ注文が作成されていなければ、注文取引から検索するか検討中だが、いまのところ取引検索条件が足りない...
                    throw new ttts.factory.errors.NotFound('Order');
                }
            } else {
                order = await orderRepo.findByOrderInquiryKey(key);
            }

            order.acceptedOffers = order.acceptedOffers
                // 余分確保分を除く
                .filter((o) => {
                    const reservation = o.itemOffered;
                    let extraProperty: ttts.factory.propertyValue.IPropertyValue<string> | undefined;
                    if (reservation.additionalProperty !== undefined) {
                        extraProperty = reservation.additionalProperty.find((p) => p.name === 'extra');
                    }

                    return reservation.additionalProperty === undefined
                        || extraProperty === undefined
                        || extraProperty.value !== '1';
                })
                // 互換性維持
                .map((o) => {
                    return {
                        ...o,
                        itemOffered: tttsReservation2chevre(o.itemOffered)
                    };
                });

            // 印刷トークンを発行
            const tokenRepo = new ttts.repository.Token(redisClient);
            const reservationIds = order.acceptedOffers.map((o) => o.itemOffered.id);
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

/**
 * 注文検索
 */
ordersRouter.get(
    '',
    permitScopes(['admin']),
    (req, __2, next) => {
        req.checkQuery('orderDateFrom')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('orderDateThrough')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('acceptedOffers.itemOffered.reservationFor.inSessionFrom')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('acceptedOffers.itemOffered.reservationFor.inSessionThrough')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('acceptedOffers.itemOffered.reservationFor.startFrom')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        req.checkQuery('acceptedOffers.itemOffered.reservationFor.startThrough')
            .optional()
            .isISO8601()
            .withMessage('must be ISO8601')
            .toDate();
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const orderRepo = new ttts.repository.Order(ttts.mongoose.connection);
            const searchConditions: ttts.factory.order.ISearchConditions = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
                sort: (req.query.sort !== undefined) ? req.query.sort : { orderDate: ttts.factory.sortType.Descending }
            };
            const orders = await orderRepo.search(searchConditions);
            const totalCount = await orderRepo.count(searchConditions);
            res.set('X-Total-Count', totalCount.toString());
            res.json(orders);
        } catch (error) {
            next(error);
        }
    }
);

export default ordersRouter;
