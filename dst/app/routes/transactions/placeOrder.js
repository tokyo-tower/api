"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 注文取引ルーター(POS専用)
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const request = require("request-promise-native");
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
const validator_1 = require("../../middlewares/validator");
const TRANSACTION_AGENT_TTL = 3600;
const TRANSACTION_AGENT_KEY_PREFIX = 'placeOrderTransactionAgent.';
const TRANSACTION_AMOUNT_TTL = 3600;
const TRANSACTION_AMOUNT_KEY_PREFIX = 'placeOrderTransactionAmount.';
const AUTHORIZE_SEAT_RESERVATION_RESULT_TTL = 3600;
const AUTHORIZE_SEAT_RESERVATION_RESULT_KEY_PREFIX = 'authorizeSeatReservationResult.';
const CUSTOMER_PROFILE_TTL = 3600;
const CUSTOMER_PROFILE_KEY_PREFIX = 'customerProfile.';
const ORDERS_TTL = 86400;
const ORDERS_KEY_PREFIX = 'orders.';
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
placeOrderTransactionsRouter.use(authentication_1.default);
placeOrderTransactionsRouter.post('/start', permitScopes_1.default(['pos']), (req, _, next) => {
    req.checkBody('expires')
        .notEmpty()
        .withMessage('required')
        .isISO8601();
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        auth.setCredentials({ access_token: req.accessToken });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT
        });
        const sellerService = new cinerinoapi.service.Seller({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT
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
            .then((body) => body);
        const expires = moment(req.body.expires)
            .toDate();
        const transaction = yield placeOrderService.start({
            expires: expires,
            object: {
                passport: { token }
            },
            seller: {
                typeOf: seller.typeOf,
                id: seller.id
            }
        });
        // 取引エージェント保管
        const transactionAgentKey = `${TRANSACTION_AGENT_KEY_PREFIX}${req.params.transactionId}`;
        yield new Promise((resolve, reject) => {
            redisClient.multi()
                .set(transactionAgentKey, JSON.stringify(transaction.agent))
                .expire(transactionAgentKey, TRANSACTION_AGENT_TTL)
                .exec((err) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        // tslint:disable-next-line:no-string-literal
        // const host = req.headers['host'];
        // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
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
placeOrderTransactionsRouter.put('/:transactionId/customerContact', permitScopes_1.default(['pos']), (req, _, next) => {
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
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        auth.setCredentials({ access_token: req.accessToken });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT
        });
        const profile = yield placeOrderService.setCustomerContact({
            id: req.params.transactionId,
            object: {
                customerContact: Object.assign({}, req.body, { id: req.user.sub, givenName: (typeof req.body.first_name === 'string') ? req.body.first_name : '', familyName: (typeof req.body.last_name === 'string') ? req.body.last_name : '', telephone: (typeof req.body.tel === 'string') ? req.body.tel : '', telephoneRegion: (typeof req.body.address === 'string') ? req.body.address : '' })
            }
        });
        // プロフィール保管
        const customerProfileKey = `${CUSTOMER_PROFILE_KEY_PREFIX}${req.params.transactionId}`;
        yield new Promise((resolve, reject) => {
            redisClient.multi()
                .set(customerProfileKey, JSON.stringify(profile))
                .expire(customerProfileKey, CUSTOMER_PROFILE_TTL)
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
            .json(Object.assign({}, profile, { 
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
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/seatReservation', permitScopes_1.default(['pos']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        if (!Array.isArray(req.body.offers)) {
            req.body.offers = [];
        }
        const performanceId = req.body.performance_id;
        auth.setCredentials({ access_token: req.accessToken });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT
        });
        const action = yield placeOrderService.createSeatReservationAuthorization({
            transactionId: req.params.transactionId,
            performanceId: performanceId,
            offers: req.body.offers
        });
        if (action.result !== undefined) {
            // 金額保管
            const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
            const amount = action.result.price;
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
            // 承認結果保管
            const authorizeSeatReservationResultKey = `${AUTHORIZE_SEAT_RESERVATION_RESULT_KEY_PREFIX}${req.params.transactionId}`;
            yield new Promise((resolve, reject) => {
                redisClient.multi()
                    .set(authorizeSeatReservationResultKey, JSON.stringify(action.result))
                    .expire(authorizeSeatReservationResultKey, AUTHORIZE_SEAT_RESERVATION_RESULT_TTL)
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
            .json(action);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['pos']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        auth.setCredentials({ access_token: req.accessToken });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT
        });
        yield placeOrderService.cancelSeatReservationAuthorization({
            transactionId: req.params.transactionId,
            actionId: req.params.actionId
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
        // 座席予約承認結果リセット
        const authorizeSeatReservationResultKey = `${AUTHORIZE_SEAT_RESERVATION_RESULT_KEY_PREFIX}${req.params.transactionId}`;
        yield new Promise((resolve, reject) => {
            redisClient.multi()
                .del(authorizeSeatReservationResultKey)
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
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['pos']), validator_1.default, 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // クライアントがPOSの場合、決済方法承認アクションを自動生成
        auth.setCredentials({ access_token: req.accessToken });
        const paymentService = new cinerinoapi.service.Payment({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT
        });
        // 金額取得
        const amountKey = `${TRANSACTION_AMOUNT_KEY_PREFIX}${req.params.transactionId}`;
        const amount = yield new Promise((resolve, reject) => {
            redisClient.get(amountKey, (err, result) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(Number(result));
                }
            });
        });
        // 取引エージェント取得
        const transactionAgentKey = `${TRANSACTION_AGENT_KEY_PREFIX}${req.params.transactionId}`;
        const transactionAgent = yield new Promise((resolve, reject) => {
            redisClient.get(transactionAgentKey, (err, result) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(JSON.parse(result));
                }
            });
        });
        // 購入者プロフィール取得
        const customerProfileKey = `${CUSTOMER_PROFILE_KEY_PREFIX}${req.params.transactionId}`;
        const customerProfile = yield new Promise((resolve, reject) => {
            redisClient.get(customerProfileKey, (err, result) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(JSON.parse(result));
                }
            });
        });
        // 座席予約承認結果取得
        const authorizeSeatReservationResultKey = `${AUTHORIZE_SEAT_RESERVATION_RESULT_KEY_PREFIX}${req.params.transactionId}`;
        const authorizeSeatReservationResult = yield new Promise((resolve, reject) => {
            redisClient.get(authorizeSeatReservationResultKey, (err, result) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(JSON.parse(result));
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
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT
        });
        const potentialActions = createPotentialActions({
            transactionId: req.params.transactionId,
            authorizeSeatReservationResult: authorizeSeatReservationResult,
            customer: transactionAgent,
            profile: customerProfile,
            informOrderUrl: `${req.protocol}://${req.hostname}/webhooks/onPlaceOrder`,
            paymentMethodName: cinerinoapi.factory.paymentMethodType.Cash
        });
        const transactionResult = yield placeOrderService.confirm({
            id: req.params.transactionId,
            potentialActions: potentialActions
        });
        // 返品できるようにしばし注文情報を保管
        const orderKey = `${ORDERS_KEY_PREFIX}${transactionResult.order.confirmationNumber}`;
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
            .json(Object.assign({}, transactionResult, { 
            // POSへ互換性維持のためにeventReservations属性を生成
            eventReservations: (transactionResult !== undefined)
                ? transactionResult.order.acceptedOffers
                    .map((o) => {
                    const r = o.itemOffered;
                    return {
                        qr_str: r.id,
                        // tslint:disable-next-line:no-magic-numbers
                        payment_no: transactionResult.order.confirmationNumber.slice(-6),
                        performance: r.reservationFor.id
                    };
                })
                : [] }));
    }
    catch (error) {
        next(error);
    }
}));
// tslint:disable-next-line:max-func-body-length
function createPotentialActions(params) {
    // 予約連携パラメータ作成
    const authorizeSeatReservationResult = params.authorizeSeatReservationResult;
    if (authorizeSeatReservationResult === undefined) {
        throw new Error('No Seat Reservation');
    }
    const acceptedOffers = (Array.isArray(authorizeSeatReservationResult.acceptedOffers))
        ? authorizeSeatReservationResult.acceptedOffers
        : [];
    const reserveTransaction = authorizeSeatReservationResult.responseBody;
    if (reserveTransaction === undefined) {
        throw new cinerinoapi.factory.errors.Argument('Transaction', 'Reserve trasaction required');
    }
    const chevreReservations = (Array.isArray(reserveTransaction.object.reservations))
        ? reserveTransaction.object.reservations
        : [];
    const event = reserveTransaction.object.reservationFor;
    if (event === undefined || event === null) {
        throw new cinerinoapi.factory.errors.Argument('Transaction', 'Event required');
    }
    let paymentNo;
    if (chevreReservations[0].underName !== undefined && Array.isArray(chevreReservations[0].underName.identifier)) {
        const paymentNoProperty = chevreReservations[0].underName.identifier.find((p) => p.name === 'paymentNo');
        if (paymentNoProperty !== undefined) {
            paymentNo = paymentNoProperty.value;
        }
    }
    const transactionAgent = params.customer;
    if (transactionAgent === undefined) {
        throw new Error('No Transaction Agent');
    }
    const customerProfile = params.profile;
    if (customerProfile === undefined) {
        throw new Error('No Customer Profile');
    }
    // 予約確定パラメータを生成
    const eventReservations = acceptedOffers.map((acceptedOffer, index) => {
        const reservation = acceptedOffer.itemOffered;
        const chevreReservation = chevreReservations.find((r) => r.id === reservation.id);
        if (chevreReservation === undefined) {
            throw new cinerinoapi.factory.errors.Argument('Transaction', `Unexpected temporary reservation: ${reservation.id}`);
        }
        return temporaryReservation2confirmed({
            reservation: reservation,
            chevreReservation: chevreReservation,
            transactionId: params.transactionId,
            customer: transactionAgent,
            profile: customerProfile,
            paymentNo: paymentNo,
            gmoOrderId: '',
            paymentSeatIndex: index.toString(),
            paymentMethodName: params.paymentMethodName
        });
    });
    const confirmReservationParams = [];
    confirmReservationParams.push({
        object: {
            typeOf: reserveTransaction.typeOf,
            id: reserveTransaction.id,
            object: {
                reservations: [
                    ...eventReservations.map((r) => {
                        // プロジェクト固有の値を連携
                        return {
                            id: r.id,
                            additionalTicketText: r.additionalTicketText,
                            underName: r.underName,
                            additionalProperty: r.additionalProperty
                        };
                    }),
                    // 余分確保分の予約にもextraプロパティを連携
                    ...chevreReservations.filter((r) => {
                        // 注文アイテムに存在しない予約(余分確保分)にフィルタリング
                        const orderItem = eventReservations.find((eventReservation) => eventReservation.id === r.id);
                        return orderItem === undefined;
                    })
                        .map((r) => {
                        return {
                            id: r.id,
                            additionalProperty: [
                                { name: 'extra', value: '1' }
                            ]
                        };
                    })
                ]
            }
        }
    });
    return {
        order: {
            potentialActions: {
                sendOrder: {
                    potentialActions: {
                        confirmReservation: confirmReservationParams
                    }
                },
                informOrder: [
                    { recipient: { url: params.informOrderUrl } }
                ]
            }
        }
    };
}
/**
 * 仮予約から確定予約を生成する
 */
function temporaryReservation2confirmed(params) {
    const customer = params.customer;
    const underName = Object.assign({}, params.profile, { typeOf: cinerinoapi.factory.personType.Person, id: customer.id, name: `${params.profile.givenName} ${params.profile.familyName}`, identifier: [
            { name: 'customerGroup', value: 'Customer' },
            { name: 'paymentNo', value: params.paymentNo },
            { name: 'transaction', value: params.transactionId },
            { name: 'gmoOrderId', value: params.gmoOrderId },
            ...(typeof params.profile.age === 'string')
                ? [{ name: 'age', value: params.profile.age }]
                : [],
            ...(Array.isArray(customer.identifier)) ? customer.identifier : [],
            ...(customer.memberOf !== undefined && customer.memberOf.membershipNumber !== undefined)
                ? [{ name: 'username', value: customer.memberOf.membershipNumber }]
                : [],
            ...(params.paymentMethodName !== undefined)
                ? [{ name: 'paymentMethod', value: params.paymentMethodName }]
                : []
        ] });
    return Object.assign({}, params.chevreReservation, { underName: underName, additionalProperty: [
            ...(Array.isArray(params.reservation.additionalProperty)) ? params.reservation.additionalProperty : [],
            { name: 'paymentSeatIndex', value: params.paymentSeatIndex }
        ], additionalTicketText: params.reservation.additionalTicketText });
}
exports.default = placeOrderTransactionsRouter;
