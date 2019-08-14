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
 * 注文取引ルーター
 */
const ttts = require("@tokyotower/domain");
const createDebug = require("debug");
const express_1 = require("express");
// tslint:disable-next-line:no-submodule-imports
const check_1 = require("express-validator/check");
const http_status_1 = require("http-status");
// import * as https from 'https';
const moment = require("moment");
const mongoose = require("mongoose");
const WAITER_DISABLED = process.env.WAITER_DISABLED === '1';
const POS_CLIENT_ID = process.env.POS_CLIENT_ID;
const STAFF_CLIENT_ID = process.env.STAFF_CLIENT_ID;
const placeOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
const debug = createDebug('ttts-api:placeOrderTransactionsRouter');
// 車椅子レート制限のためのRedis接続クライアント
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
placeOrderTransactionsRouter.use(authentication_1.default);
placeOrderTransactionsRouter.post('/start', permitScopes_1.default(['transactions']), (req, _, next) => {
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
        && req.user.client_id !== POS_CLIENT_ID
        && req.user.client_id !== STAFF_CLIENT_ID) {
        req.checkBody('passportToken', 'invalid passportToken')
            .notEmpty()
            .withMessage('passportToken is required');
    }
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transaction = yield ttts.service.transaction.placeOrderInProgress.start({
            expires: moment(req.body.expires)
                .toDate(),
            agent: Object.assign({}, req.agent, { identifier: [
                    ...(req.agent.identifier !== undefined) ? req.agent.identifier : [],
                    ...(req.body.agent !== undefined && req.body.agent.identifier !== undefined) ? req.body.agent.identifier : []
                ] }),
            sellerIdentifier: req.body.seller_identifier,
            clientUser: req.user,
            purchaserGroup: req.body.purchaser_group,
            passportToken: req.body.passportToken
        })(new ttts.repository.Transaction(mongoose.connection), new ttts.repository.Seller(mongoose.connection));
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
placeOrderTransactionsRouter.put('/:transactionId/customerContact', permitScopes_1.default(['transactions']), (req, _, next) => {
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
        const contact = yield ttts.service.transaction.placeOrderInProgress.setCustomerContact(req.user.sub, req.params.transactionId, Object.assign({}, req.body, { age: (req.body.age !== undefined) ? req.body.age : '', address: (req.body.address !== undefined) ? req.body.address : '', gender: (req.body.gender !== undefined) ? req.body.gender : '' }))(new ttts.repository.Transaction(mongoose.connection));
        res.status(http_status_1.CREATED)
            .json(contact);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/seatReservation', permitScopes_1.default(['transactions']), (__1, __2, next) => {
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        if (!Array.isArray(req.body.offers)) {
            req.body.offers = [];
        }
        const performanceId = req.body.performance_id;
        const action = yield ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(req.user.sub, req.params.transactionId, performanceId, req.body.offers.map((offer) => {
            return {
                ticket_type: offer.ticket_type,
                watcher_name: offer.watcher_name
            };
        }))(new ttts.repository.Transaction(mongoose.connection), new ttts.repository.Performance(mongoose.connection), new ttts.repository.Action(mongoose.connection), new ttts.repository.rateLimit.TicketTypeCategory(redisClient), new ttts.repository.Task(mongoose.connection), new ttts.repository.Project(mongoose.connection));
        // 余分確保予約を除いてレスポンスを返す
        if (action.result !== undefined) {
            action.result.tmpReservations = action.result.tmpReservations.filter((r) => {
                // 余分確保分を除く
                let extraProperty;
                if (r.additionalProperty !== undefined) {
                    extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
                }
                return r.additionalProperty === undefined
                    || extraProperty === undefined
                    || extraProperty.value !== '1';
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
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(req.user.sub, req.params.transactionId, req.params.actionId)(new ttts.repository.Transaction(mongoose.connection), new ttts.repository.Action(mongoose.connection), new ttts.repository.rateLimit.TicketTypeCategory(redisClient), new ttts.repository.Task(mongoose.connection), new ttts.repository.Project(mongoose.connection));
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/creditCard', permitScopes_1.default(['transactions']), (req, __2, next) => {
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
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 会員IDを強制的にログイン中の人物IDに変更
        const creditCard = Object.assign({}, req.body.creditCard, {
            memberId: (req.user.username !== undefined) ? req.user.sub : undefined
        });
        debug('authorizing credit card...', creditCard);
        debug('authorizing credit card...', req.body.creditCard);
        const action = yield ttts.service.payment.creditCard.authorize({
            project: { id: process.env.PROJECT_ID },
            agent: { id: req.user.sub },
            object: {
                typeOf: ttts.factory.cinerino.paymentMethodType.CreditCard,
                // name: req.body.object.name,
                // additionalProperty: req.body.object.additionalProperty,
                orderId: req.body.orderId,
                amount: req.body.amount,
                method: req.body.method,
                creditCard: creditCard
            },
            purpose: { typeOf: ttts.factory.transactionType.PlaceOrder, id: req.params.transactionId }
        })({
            action: new ttts.repository.Action(mongoose.connection),
            project: new ttts.repository.Project(mongoose.connection),
            seller: new ttts.repository.Seller(mongoose.connection),
            transaction: new ttts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.CREATED)
            .json({
            id: action.id
        });
    }
    catch (error) {
        let handledError = error;
        if (error.name === 'CinerinoError') {
            const reason = error.reason;
            switch (reason) {
                case ttts.factory.cinerino.errorCode.AlreadyInUse:
                    handledError = new ttts.factory.errors.AlreadyInUse(error.entityName, error.fieldNames, error.message);
                    break;
                case ttts.factory.cinerino.errorCode.Argument:
                    handledError = new ttts.factory.errors.Argument(error.argumentName, error.message);
                    break;
                case ttts.factory.cinerino.errorCode.RateLimitExceeded:
                    handledError = new ttts.factory.errors.RateLimitExceeded(error.message);
                    break;
                default:
            }
        }
        next(handledError);
    }
}));
/**
 * クレジットカードオーソリ取消
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/creditCard/:actionId', permitScopes_1.default(['transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield ttts.service.payment.creditCard.voidTransaction({
            project: { id: req.project.id },
            agent: { id: req.user.sub },
            id: req.params.actionId,
            purpose: { typeOf: ttts.factory.transactionType.PlaceOrder, id: req.params.transactionId }
        })({
            action: new ttts.repository.Action(mongoose.connection),
            project: new ttts.repository.Project(mongoose.connection),
            transaction: new ttts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['transactions']), validator_1.default, 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const paymentMethodType = req.body.payment_method;
        const actionRepo = new ttts.repository.Action(mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(mongoose.connection);
        // クライアントがPOSあるいは内部予約の場合、決済方法承認アクションを自動生成
        if (req.user.client_id === POS_CLIENT_ID || req.user.client_id === STAFF_CLIENT_ID) {
            const authorizeActions = yield actionRepo.searchByPurpose({
                typeOf: ttts.factory.actionType.AuthorizeAction,
                purpose: {
                    typeOf: ttts.factory.transactionType.PlaceOrder,
                    id: req.params.transactionId
                }
            });
            const seatReservationAuthorizeAction = authorizeActions
                .filter((a) => a.actionStatus === ttts.factory.actionStatusType.CompletedActionStatus)
                .find((a) => a.object.typeOf === ttts.factory.action.authorize.seatReservation.ObjectType.SeatReservation);
            const authorizeSeatReservationResult = seatReservationAuthorizeAction.result;
            const tmpReservations = authorizeSeatReservationResult.tmpReservations;
            const price = tmpReservations.reduce((a, b) => {
                const unitPrice = (b.reservedTicket.ticketType.priceSpecification !== undefined)
                    ? b.reservedTicket.ticketType.priceSpecification.price
                    : 0;
                return a + unitPrice;
            }, 0);
            yield ttts.service.payment.any.authorize({
                agent: { id: req.user.sub },
                object: {
                    typeOf: paymentMethodType,
                    name: paymentMethodType,
                    additionalProperty: [],
                    amount: price
                },
                purpose: { typeOf: ttts.factory.transactionType.PlaceOrder, id: req.params.transactionId }
            })({
                action: actionRepo,
                seller: new ttts.repository.Seller(mongoose.connection),
                transaction: transactionRepo
            });
        }
        const transactionResult = yield ttts.service.transaction.placeOrderInProgress.confirm({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            paymentMethod: paymentMethodType
        })(transactionRepo, actionRepo, new ttts.repository.Token(redisClient), new ttts.repository.PaymentNo(redisClient));
        debug('transaction confirmed.');
        // 余分確保予約を除いてレスポンスを返す
        if (transactionResult !== undefined) {
            transactionResult.order.acceptedOffers = transactionResult.order.acceptedOffers
                .filter((o) => {
                const r = o.itemOffered;
                // 余分確保分を除く
                let extraProperty;
                if (r.additionalProperty !== undefined) {
                    extraProperty = r.additionalProperty.find((p) => p.name === 'extra');
                }
                return r.additionalProperty === undefined
                    || extraProperty === undefined
                    || extraProperty.value !== '1';
            });
            // POSへ互換性維持のためにeventReservations属性を生成
            transactionResult.eventReservations = transactionResult.order.acceptedOffers
                .map((o) => {
                const r = o.itemOffered;
                return {
                    qr_str: r.id,
                    // tslint:disable-next-line:no-magic-numbers
                    payment_no: transactionResult.order.confirmationNumber.slice(-6),
                    performance: r.reservationFor.id
                };
            });
        }
        res.status(http_status_1.CREATED)
            .json(transactionResult);
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/tasks/sendEmailNotification', permitScopes_1.default(['transactions']), (req, __2, next) => {
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
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const task = yield ttts.service.transaction.placeOrder.sendEmail(req.params.transactionId, {
            typeOf: ttts.factory.creativeWorkType.EmailMessage,
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
        })(new ttts.repository.Task(mongoose.connection), new ttts.repository.Transaction(mongoose.connection));
        res.status(http_status_1.CREATED)
            .json(task);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 取引検索
 */
placeOrderTransactionsRouter.get('', permitScopes_1.default(['admin']), ...[
    check_1.query('startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('startThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('endFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('endThrough')
        .optional()
        .isISO8601()
        .toDate()
], validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transactionRepo = new ttts.repository.Transaction(mongoose.connection);
        const searchConditions = Object.assign({}, req.query, { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100, page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1, sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: ttts.factory.sortType.Ascending }, typeOf: ttts.factory.transactionType.PlaceOrder });
        const transactions = yield transactionRepo.search(searchConditions);
        const totalCount = yield transactionRepo.count(searchConditions);
        res.set('X-Total-Count', totalCount.toString());
        res.json(transactions);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placeOrderTransactionsRouter;
