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
/**
 * 注文取引ルーター(POS専用)
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const request = require("request-promise-native");
const ticketTypeCategoryRateLimit_1 = require("../ticketTypeCategoryRateLimit");
const auth = new cinerinoapi.auth.ClientCredentials({
    domain: '',
    clientId: '',
    clientSecret: '',
    scopes: [],
    state: ''
});
const chevreAuthClient = new ttts.chevre.auth.ClientCredentials({
    domain: process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.CHEVRE_CLIENT_ID,
    clientSecret: process.env.CHEVRE_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const placeOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
const TRANSACTION_TTL = 3600;
const TRANSACTION_KEY_PREFIX = 'ttts-api:placeOrder:';
const TRANSACTION_AGENT_TTL = TRANSACTION_TTL;
const TRANSACTION_AGENT_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}agent:`;
const TRANSACTION_AMOUNT_TTL = TRANSACTION_TTL;
const TRANSACTION_AMOUNT_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}amount:`;
const AUTHORIZE_SEAT_RESERVATION_RESULT_TTL = TRANSACTION_TTL;
const AUTHORIZE_SEAT_RESERVATION_RESULT_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}authorizeSeatReservationResult:`;
const CUSTOMER_PROFILE_TTL = TRANSACTION_TTL;
const CUSTOMER_PROFILE_KEY_PREFIX = `${TRANSACTION_KEY_PREFIX}customerProfile:`;
const ORDERS_TTL = 86400;
exports.ORDERS_KEY_PREFIX = 'ttts-api:orders:';
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
}, validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        const transactionAgentKey = `${TRANSACTION_AGENT_KEY_PREFIX}${transaction.id}`;
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
}, validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        auth.setCredentials({ access_token: req.accessToken });
        const placeOrderService = new cinerinoapi.service.transaction.PlaceOrder4ttts({
            auth: auth,
            endpoint: process.env.CINERINO_API_ENDPOINT
        });
        const profile = yield placeOrderService.setCustomerContact({
            id: req.params.transactionId,
            object: {
                customerContact: Object.assign(Object.assign({}, req.body), { id: req.user.sub, givenName: (typeof req.body.first_name === 'string') ? req.body.first_name : '', familyName: (typeof req.body.last_name === 'string') ? req.body.last_name : '', telephone: (typeof req.body.tel === 'string') ? req.body.tel : '', telephoneRegion: (typeof req.body.address === 'string') ? req.body.address : '' })
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
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/seatReservation', permitScopes_1.default(['pos']), validator_1.default, 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        // 券種詳細取得
        let wheelChairOfferExists = false;
        const projectRepo = new ttts.repository.Project(mongoose.connection);
        const project = yield projectRepo.findById({ id: req.project.id });
        if (project.settings === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (project.settings.chevre === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('Project settings not found');
        }
        const eventService = new ttts.chevre.service.Event({
            endpoint: project.settings.chevre.endpoint,
            auth: chevreAuthClient
        });
        const event = yield eventService.findById({ id: performanceId });
        const ticketOffers = yield eventService.searchTicketOffers({ id: performanceId });
        // tslint:disable-next-line:max-line-length
        let action;
        try {
            // 車椅子レート制限確認(取引IDを保持者に指定)
            for (const offer of req.body.offers) {
                // リクエストで指定されるのは、券種IDではなく券種コードなので要注意
                const ticketOffer = ticketOffers.find((t) => t.identifier === offer.ticket_type);
                if (ticketOffer === undefined) {
                    throw new ttts.factory.errors.NotFound('Offer', `Offer ${offer.ticket_type} not found`);
                }
                let ticketTypeCategory = ttts.factory.ticketTypeCategory.Normal;
                if (Array.isArray(ticketOffer.additionalProperty)) {
                    const categoryProperty = ticketOffer.additionalProperty.find((p) => p.name === 'category');
                    if (categoryProperty !== undefined) {
                        ticketTypeCategory = categoryProperty.value;
                    }
                }
                if (ticketTypeCategory === ttts.factory.ticketTypeCategory.Wheelchair) {
                    wheelChairOfferExists = true;
                    yield processLockTicketTypeCategoryRateLimit(event, { id: req.params.transactionId });
                }
            }
            action = yield placeOrderService.createSeatReservationAuthorization({
                transactionId: req.params.transactionId,
                performanceId: performanceId,
                offers: req.body.offers
            });
        }
        catch (error) {
            if (wheelChairOfferExists) {
                yield processUnlockTicketTypeCategoryRateLimit(event, { id: req.params.transactionId });
            }
            throw error;
        }
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
            // 承認結果保管
            const authorizeSeatReservationResultKey = `${AUTHORIZE_SEAT_RESERVATION_RESULT_KEY_PREFIX}${req.params.transactionId}`;
            yield new Promise((resolve, reject) => {
                redisClient.multi()
                    .set(authorizeSeatReservationResultKey, JSON.stringify(actionResult))
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
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['pos']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        // 座席予約承認結果取得
        const authorizeSeatReservationResultKey = `${AUTHORIZE_SEAT_RESERVATION_RESULT_KEY_PREFIX}${req.params.transactionId}`;
        const authorizeSeatReservationResult = 
        // tslint:disable-next-line:max-line-length
        yield new Promise((resolve, reject) => {
            redisClient.get(authorizeSeatReservationResultKey, (err, reply) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(JSON.parse(reply));
                }
            });
        });
        const event = authorizeSeatReservationResult.responseBody.object.reservationFor;
        if (event !== undefined && event !== null) {
            if (Array.isArray(authorizeSeatReservationResult.acceptedOffers)) {
                yield Promise.all(authorizeSeatReservationResult.acceptedOffers.map((acceptedOffer) => __awaiter(void 0, void 0, void 0, function* () {
                    const reservation = acceptedOffer.itemOffered;
                    let ticketTypeCategory = ttts.factory.ticketTypeCategory.Normal;
                    if (Array.isArray(reservation.reservedTicket.ticketType.additionalProperty)) {
                        const categoryProperty = reservation.reservedTicket.ticketType.additionalProperty.find((p) => p.name === 'category');
                        if (categoryProperty !== undefined) {
                            ticketTypeCategory = categoryProperty.value;
                        }
                    }
                    if (ticketTypeCategory === ttts.factory.ticketTypeCategory.Wheelchair) {
                        yield processUnlockTicketTypeCategoryRateLimit(event, { id: req.params.transactionId });
                    }
                })));
            }
        }
        // 座席予約承認結果リセット
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
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
            redisClient.get(amountKey, (err, reply) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(Number(reply));
                }
            });
        });
        // 取引エージェント取得
        // const transactionAgentKey = `${TRANSACTION_AGENT_KEY_PREFIX}${req.params.transactionId}`;
        // const transactionAgent = await new Promise<any>((resolve, reject) => {
        //     redisClient.get(transactionAgentKey, (err, reply) => {
        //         if (err !== null) {
        //             reject(err);
        //         } else {
        //             resolve(JSON.parse(reply));
        //         }
        //     });
        // });
        // 購入者プロフィール取得
        // const customerProfileKey = `${CUSTOMER_PROFILE_KEY_PREFIX}${req.params.transactionId}`;
        // const customerProfile = await new Promise<any>((resolve, reject) => {
        //     redisClient.get(customerProfileKey, (err, reply) => {
        //         if (err !== null) {
        //             reject(err);
        //         } else {
        //             resolve(JSON.parse(reply));
        //         }
        //     });
        // });
        // 座席予約承認結果取得
        const authorizeSeatReservationResultKey = `${AUTHORIZE_SEAT_RESERVATION_RESULT_KEY_PREFIX}${req.params.transactionId}`;
        const authorizeSeatReservationResult = yield new Promise((resolve, reject) => {
            redisClient.get(authorizeSeatReservationResultKey, (err, reply) => {
                if (err !== null) {
                    reject(err);
                }
                else {
                    resolve(JSON.parse(reply));
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
        // 購入番号発行
        // const paymentNoRepo = new ttts.repository.PaymentNo(redisClient);
        const reserveTransaction = authorizeSeatReservationResult.responseBody;
        if (reserveTransaction === undefined) {
            throw new cinerinoapi.factory.errors.Argument('Transaction', 'Reserve trasaction required');
        }
        const event = reserveTransaction.object.reservationFor;
        if (event === undefined || event === null) {
            throw new cinerinoapi.factory.errors.Argument('Transaction', 'Event required');
        }
        // const eventStartDateStr = moment(event.startDate)
        //     .tz('Asia/Tokyo')
        //     .format('YYYYMMDD');
        // const paymentNo = await paymentNoRepo.publish(eventStartDateStr);
        // const { potentialActions, result } = createPotentialActions({
        //     transactionId: req.params.transactionId,
        //     authorizeSeatReservationResult: authorizeSeatReservationResult,
        //     customer: transactionAgent,
        //     profile: customerProfile,
        //     paymentMethodName: cinerinoapi.factory.paymentMethodType.Cash,
        //     paymentNo: paymentNo
        // });
        const transactionResult = yield placeOrderService.confirm({
            id: req.params.transactionId
            // potentialActions: potentialActions,
            // result: result
        });
        let paymentNo;
        if (Array.isArray(transactionResult.order.identifier)) {
            const paymentNoProperty = transactionResult.order.identifier.find((p) => p.name === 'paymentNo');
            if (paymentNoProperty !== undefined) {
                paymentNo = paymentNoProperty.value;
            }
        }
        if (paymentNo === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('paymentNo not found');
        }
        let confirmationNumber;
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
            .json(Object.assign(Object.assign({}, transactionResult), { 
            // POSへ互換性維持のためにeventReservations属性を生成
            eventReservations: (transactionResult !== undefined)
                ? transactionResult.order.acceptedOffers
                    .map((o) => {
                    const r = o.itemOffered;
                    return {
                        qr_str: r.id,
                        payment_no: paymentNo,
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
            paymentNo: params.paymentNo,
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
                            // additionalTicketText: r.additionalTicketText,
                            underName: r.underName,
                            additionalProperty: r.additionalProperty
                        };
                    })
                ]
            }
        }
    });
    const eventStartDateStr = moment(event.startDate)
        .tz('Asia/Tokyo')
        .format('YYYYMMDD');
    const confirmationNumber = `${eventStartDateStr}${params.paymentNo}`;
    const confirmationPass = (typeof customerProfile.telephone === 'string')
        // tslint:disable-next-line:no-magic-numbers
        ? customerProfile.telephone.slice(-4)
        : '9999';
    return {
        potentialActions: {
            order: {
                potentialActions: {
                    sendOrder: {
                        potentialActions: {
                            confirmReservation: confirmReservationParams
                        }
                    }
                }
            }
        },
        result: {
            order: {
                identifier: [
                    { name: 'confirmationNumber', value: confirmationNumber },
                    { name: 'confirmationPass', value: confirmationPass }
                ]
            }
        }
    };
}
exports.createPotentialActions = createPotentialActions;
/**
 * 仮予約から確定予約を生成する
 */
function temporaryReservation2confirmed(params) {
    const customer = params.customer;
    const underName = Object.assign(Object.assign({}, params.profile), { typeOf: cinerinoapi.factory.personType.Person, id: customer.id, name: `${params.profile.givenName} ${params.profile.familyName}`, identifier: [
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
    return Object.assign(Object.assign({}, params.chevreReservation), { underName: underName, additionalProperty: [
            ...(Array.isArray(params.reservation.additionalProperty)) ? params.reservation.additionalProperty : [],
            { name: 'paymentSeatIndex', value: params.paymentSeatIndex }
        ] });
}
function processLockTicketTypeCategoryRateLimit(event, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
        const rateLimitKey = {
            performanceStartDate: moment(event.startDate)
                .toDate(),
            ticketTypeCategory: ttts.factory.ticketTypeCategory.Wheelchair,
            unitInSeconds: ticketTypeCategoryRateLimit_1.WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
        };
        yield rateLimitRepo.lock(rateLimitKey, transaction.id);
    });
}
function processUnlockTicketTypeCategoryRateLimit(event, transaction) {
    return __awaiter(this, void 0, void 0, function* () {
        // レート制限があれば解除
        const performanceStartDate = moment(event.startDate)
            .toDate();
        const rateLimitKey = {
            performanceStartDate: performanceStartDate,
            ticketTypeCategory: ttts.factory.ticketTypeCategory.Wheelchair,
            unitInSeconds: ticketTypeCategoryRateLimit_1.WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
        };
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
        const holder = yield rateLimitRepo.getHolder(rateLimitKey);
        if (holder === transaction.id) {
            yield rateLimitRepo.unlock(rateLimitKey);
        }
    });
}
exports.default = placeOrderTransactionsRouter;
