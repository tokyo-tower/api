"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDERS_KEY_PREFIX = void 0;
/**
 * 注文取引ルーター(POS専用)
 */
const cinerinoapi = require("@cinerino/sdk");
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const redis = require("redis");
const request = require("request-promise-native");
const project = { typeOf: 'Project', id: process.env.PROJECT_ID };
const auth = new cinerinoapi.auth.ClientCredentials({
    domain: '',
    clientId: '',
    clientSecret: '',
    scopes: [],
    state: ''
});
const placeOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const rateLimit_1 = require("../../middlewares/rateLimit");
const validator_1 = require("../../middlewares/validator");
const TRANSACTION_TTL = 3600;
const TRANSACTION_KEY_PREFIX = 'ttts-api:placeOrder:';
const TRANSACTION_AMOUNT_TTL = TRANSACTION_TTL;
const TRANSACTION_AMOUNT_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}amount:`;
const ORDERS_TTL = 86400;
exports.ORDERS_KEY_PREFIX = 'ttts-api:orders:';
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: (process.env.REDIS_TLS_SERVERNAME !== undefined) ? { servername: process.env.REDIS_TLS_SERVERNAME } : undefined
});
placeOrderTransactionsRouter.use(authentication_1.default);
placeOrderTransactionsRouter.use(rateLimit_1.default);
placeOrderTransactionsRouter.post('/start', permitScopes_1.default(['pos']), ...[
    express_validator_1.body('expires')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
        .isISO8601()
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        auth.setCredentials({ access_token: req.accessToken });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        const sellerService = new cinerinoapi.service.Seller({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        const searchSellersResult = yield sellerService.search({
            limit: 1
        });
        const seller = searchSellersResult.data.shift();
        if (seller === undefined) {
            throw new Error('Seller not found');
        }
        // WAITER許可証を取得
        const scope = 'placeOrderTransaction.TokyoTower.POS';
        const { token } = yield request.post(`${process.env.WAITER_ENDPOINT}/projects/${process.env.PROJECT_ID}/passports`, {
            json: true,
            body: { scope: scope }
        })
            .then((result) => result);
        const expires = moment(req.body.expires)
            .toDate();
        const transaction = yield placeOrderService.start({
            expires: expires,
            object: {
                passport: { token }
            },
            seller: {
                typeOf: seller.typeOf,
                id: String(seller.id)
            }
        });
        res.status(http_status_1.CREATED)
            .json(transaction);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put('/:transactionId/customerContact', permitScopes_1.default(['pos']), ...[
    express_validator_1.body('last_name')
        .not()
        .isEmpty()
        .withMessage(() => 'required'),
    express_validator_1.body('first_name')
        .not()
        .isEmpty()
        .withMessage(() => 'required'),
    express_validator_1.body('tel')
        .not()
        .isEmpty()
        .withMessage(() => 'required'),
    express_validator_1.body('email')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        auth.setCredentials({ access_token: req.accessToken });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        const profile = Object.assign(Object.assign({}, req.body), { id: req.user.sub, givenName: (typeof req.body.first_name === 'string') ? req.body.first_name : '', familyName: (typeof req.body.last_name === 'string') ? req.body.last_name : '', telephone: (typeof req.body.tel === 'string') ? req.body.tel : '', telephoneRegion: (typeof req.body.address === 'string') ? req.body.address : '' });
        yield placeOrderService.setProfile({
            id: req.params.transactionId,
            agent: profile
        });
        res.status(http_status_1.CREATED)
            .json(Object.assign(Object.assign({}, profile), { 
            // POSへの互換性維持のために値補完
            last_name: profile.familyName, first_name: profile.givenName, tel: profile.telephone }));
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/seatReservation', permitScopes_1.default(['pos']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!Array.isArray(req.body.offers)) {
            req.body.offers = [];
        }
        const performanceId = req.body.performance_id;
        auth.setCredentials({ access_token: req.accessToken });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        const action = yield placeOrderService.createSeatReservationAuthorization({
            transactionId: req.params.transactionId,
            performanceId: performanceId,
            offers: req.body.offers
        });
        const actionResult = action.result;
        if (actionResult !== undefined) {
            // 金額保管
            const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
            const amount = actionResult.price;
            yield new Promise((resolve, reject) => {
                redisClient.multi()
                    .set(amountKey, amount.toString())
                    .expire(amountKey, TRANSACTION_AMOUNT_TTL)
                    .exec((err) => {
                    if (err !== null) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        res.status(http_status_1.CREATED)
            // responseはアクションIDのみで十分
            .json({ id: action.id });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['pos']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        auth.setCredentials({ access_token: req.accessToken });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        yield placeOrderService.voidSeatReservation({
            id: req.params.actionId,
            purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: req.params.transactionId }
        });
        // 金額リセット
        const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
        yield new Promise((resolve, reject) => {
            redisClient.multi()
                .set(amountKey, '0')
                .expire(amountKey, TRANSACTION_AMOUNT_TTL)
                .exec((err) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['pos']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // クライアントがPOSの場合、決済方法承認アクションを自動生成
        auth.setCredentials({ access_token: req.accessToken });
        const paymentService = new cinerinoapi.service.Payment({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        // 金額取得
        const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
        const amount = yield new Promise((resolve, reject) => {
            redisClient.get(amountKey, (err, reply) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(Number(reply));
                }
            });
        });
        yield paymentService.authorizeAnyPayment({
            object: {
                typeOf: cinerinoapi.factory.paymentMethodType.Cash,
                name: cinerinoapi.factory.paymentMethodType.Cash,
                additionalProperty: [],
                amount: amount
            },
            purpose: { typeOf: cinerinoapi.factory.transactionType.PlaceOrder, id: req.params.transactionId }
        });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        const transactionResult = yield placeOrderService.confirm({
            id: req.params.transactionId
        });
        const confirmationNumber = (_b = (_a = transactionResult.order.identifier) === null || _a === void 0 ? void 0 : _a.find((p) => p.name === 'confirmationNumber')) === null || _b === void 0 ? void 0 : _b.value;
        if (confirmationNumber === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('confirmationNumber not found');
        }
        // 返品できるようにしばし注文情報を保管
        const orderKey = `${exports.ORDERS_KEY_PREFIX}${confirmationNumber}`;
        yield new Promise((resolve, reject) => {
            redisClient.multi()
                .set(orderKey, JSON.stringify(transactionResult.order))
                .expire(orderKey, ORDERS_TTL)
                .exec((err) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        res.status(http_status_1.CREATED)
            .json({
            // POSへのレスポンスとしてeventReservations属性を生成
            eventReservations: transactionResult.order.acceptedOffers
                .map((o) => {
                const r = o.itemOffered;
                return {
                    qr_str: r.id,
                    payment_no: transactionResult.order.confirmationNumber,
                    performance: r.reservationFor.id
                };
            })
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placeOrderTransactionsRouter;
