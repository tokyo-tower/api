/**
 * 注文取引ルーター(POS専用)
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
import { CREATED, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';
import * as request from 'request-promise-native';

const auth = new cinerinoapi.auth.ClientCredentials({
    domain: '',
    clientId: '',
    clientSecret: '',
    scopes: [],
    state: ''
});

const placeOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

const TRANSACTION_TTL = 3600;
const TRANSACTION_KEY_PREFIX = 'ttts-api:placeOrder:';
const TRANSACTION_AMOUNT_TTL = TRANSACTION_TTL;
const TRANSACTION_AMOUNT_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}amount:`;
// const CUSTOMER_PROFILE_TTL = TRANSACTION_TTL;
// const CUSTOMER_PROFILE_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}customerProfile:`;

const ORDERS_TTL = 86400;
export const ORDERS_KEY_PREFIX = 'ttts-api:orders:';

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

placeOrderTransactionsRouter.use(authentication);

placeOrderTransactionsRouter.post(
    '/start',
    permitScopes(['pos']),
    (req, _, next) => {
        req.checkBody('expires')
            .notEmpty()
            .withMessage('required')
            .isISO8601();

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            auth.setCredentials({ access_token: req.accessToken });
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT
            });
            const sellerService = new cinerinoapi.service.Seller({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT
            });

            const searchSellersResult = await sellerService.search({
                limit: 1
            });
            const seller = searchSellersResult.data.shift();
            if (seller === undefined) {
                throw new Error('Seller not found');
            }

            // WAITER許可証を取得
            const scope = 'placeOrderTransaction.TokyoTower.POS';
            const { token } = await request.post(
                `${process.env.WAITER_ENDPOINT}/projects/${<string>process.env.PROJECT_ID}/passports`,
                {
                    json: true,
                    body: { scope: scope }
                }
            )
                .then((body) => body);

            const expires = moment(req.body.expires)
                .toDate();

            const transaction = await placeOrderService.start({
                expires: expires,
                object: {
                    passport: { token }
                },
                seller: {
                    typeOf: seller.typeOf,
                    id: seller.id
                }
            });

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
    permitScopes(['pos']),
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
            auth.setCredentials({ access_token: req.accessToken });
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT
            });

            const profile = await placeOrderService.setCustomerContact({
                id: req.params.transactionId,
                object: {
                    customerContact: {
                        ...req.body,
                        id: req.user.sub,
                        givenName: (typeof req.body.first_name === 'string') ? req.body.first_name : '',
                        familyName: (typeof req.body.last_name === 'string') ? req.body.last_name : '',
                        telephone: (typeof req.body.tel === 'string') ? req.body.tel : '',
                        telephoneRegion: (typeof req.body.address === 'string') ? req.body.address : ''
                    }
                }
            });

            // プロフィール保管
            // const customerProfileKey = `${CUSTOMER_PROFILE_KEY_PREFIX}${req.params.transactionId}`;
            // await new Promise((resolve, reject) => {
            //     redisClient.multi()
            //         .set(customerProfileKey, JSON.stringify(profile))
            //         .expire(customerProfileKey, CUSTOMER_PROFILE_TTL)
            //         .exec((err) => {
            //             if (err !== null) {
            //                 reject(err);
            //             } else {
            //                 resolve();
            //             }
            //         });
            // });

            res.status(CREATED)
                .json({
                    ...profile,
                    // POSへの互換性維持のために値補完
                    last_name: profile.familyName,
                    first_name: profile.givenName,
                    tel: profile.telephone
                });
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
    permitScopes(['pos']),
    validator,
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            if (!Array.isArray(req.body.offers)) {
                req.body.offers = [];
            }

            const performanceId: string = req.body.performance_id;

            auth.setCredentials({ access_token: req.accessToken });
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT
            });

            // 券種詳細取得
            const projectRepo = new ttts.repository.Project(mongoose.connection);
            const project = await projectRepo.findById({ id: req.project.id });
            if (project.settings === undefined) {
                throw new ttts.factory.errors.ServiceUnavailable('Project settings undefined');
            }
            if (project.settings.chevre === undefined) {
                throw new ttts.factory.errors.ServiceUnavailable('Project settings not found');
            }

            // tslint:disable-next-line:max-line-length
            let action: cinerinoapi.factory.action.authorize.offer.seatReservation.IAction<cinerinoapi.factory.service.webAPI.Identifier.Chevre> | undefined;
            try {
                action = await placeOrderService.createSeatReservationAuthorization({
                    transactionId: req.params.transactionId,
                    performanceId: performanceId,
                    offers: req.body.offers
                });
            } catch (error) {
                throw error;
            }

            const actionResult = action.result;
            if (actionResult !== undefined) {
                // 金額保管
                const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
                const amount = actionResult.price;
                await new Promise((resolve, reject) => {
                    redisClient.multi()
                        .set(amountKey, amount.toString())
                        .expire(amountKey, TRANSACTION_AMOUNT_TTL)
                        .exec((err) => {
                            if (err !== null) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
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
    permitScopes(['pos']),
    validator,
    async (req, res, next) => {
        try {
            auth.setCredentials({ access_token: req.accessToken });
            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT
            });

            await placeOrderService.voidSeatReservation({
                id: <string>req.params.actionId,
                purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: <string>req.params.transactionId }
            });

            // 金額リセット
            const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
            await new Promise((resolve, reject) => {
                redisClient.multi()
                    .set(amountKey, '0')
                    .expire(amountKey, TRANSACTION_AMOUNT_TTL)
                    .exec((err) => {
                        if (err !== null) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
            });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/confirm',
    permitScopes(['pos']),
    validator,
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            // クライアントがPOSの場合、決済方法承認アクションを自動生成
            auth.setCredentials({ access_token: req.accessToken });
            const paymentService = new cinerinoapi.service.Payment({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT
            });

            // 金額取得
            const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
            const amount = await new Promise<number>((resolve, reject) => {
                redisClient.get(amountKey, (err, reply) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve(Number(reply));
                    }
                });
            });

            await paymentService.authorizeAnyPayment({
                object: {
                    typeOf: cinerinoapi.factory.paymentMethodType.Cash,
                    name: cinerinoapi.factory.paymentMethodType.Cash,
                    additionalProperty: [],
                    amount: amount
                },
                purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: req.params.transactionId }
            });

            const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
                auth: auth,
                endpoint: <string>process.env.CINERINO_API_ENDPOINT
            });

            const transactionResult = await placeOrderService.confirm({
                id: req.params.transactionId
            });

            let paymentNo: string | undefined;
            if (Array.isArray(transactionResult.order.identifier)) {
                const paymentNoProperty = transactionResult.order.identifier.find((p) => p.name === 'paymentNo');
                if (paymentNoProperty !== undefined) {
                    paymentNo = paymentNoProperty.value;
                }
            }
            if (paymentNo === undefined) {
                throw new ttts.factory.errors.ServiceUnavailable('paymentNo not found');
            }

            let confirmationNumber: string | undefined;
            if (Array.isArray(transactionResult.order.identifier)) {
                const confirmationNumberProperty = transactionResult.order.identifier.find((p) => p.name === 'confirmationNumber');
                if (confirmationNumberProperty !== undefined) {
                    confirmationNumber = confirmationNumberProperty.value;
                }
            }
            if (confirmationNumber === undefined) {
                throw new ttts.factory.errors.ServiceUnavailable('confirmationNumber not found');
            }

            // 返品できるようにしばし注文情報を保管
            const orderKey = `${ORDERS_KEY_PREFIX}${confirmationNumber}`;
            await new Promise((resolve, reject) => {
                redisClient.multi()
                    .set(orderKey, JSON.stringify(transactionResult.order))
                    .expire(orderKey, ORDERS_TTL)
                    .exec((err) => {
                        if (err !== null) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
            });

            res.status(CREATED)
                .json({
                    ...transactionResult,
                    // POSへ互換性維持のためにeventReservations属性を生成
                    eventReservations: (transactionResult !== undefined)
                        ? transactionResult.order.acceptedOffers
                            .map((o) => {
                                const r = <cinerinoapi.factory.order.IReservation>o.itemOffered;

                                return {
                                    qr_str: r.id,
                                    payment_no: paymentNo,
                                    performance: r.reservationFor.id
                                };
                            })
                        : []
                });
        } catch (error) {
            next(error);
        }
    }
);

export default placeOrderTransactionsRouter;
