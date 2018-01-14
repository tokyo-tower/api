"use strict";
/**
 * 注文取引ルーター
 * @ignore
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const createDebug = require("debug");
const express_1 = require("express");
const http_status_1 = require("http-status");
const https = require("https");
const moment = require("moment");
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
const creditService = new ttts.GMO.service.Credit({ endpoint: process.env.GMO_ENDPOINT }, 
// クレジットカードオーソリ実行&取消のリクエストは、混雑時接続数が増加するので、プーリング
{
    agent: new https.Agent({
        keepAlive: true,
        maxSockets: 40,
        maxFreeSockets: 10
        // timeout: 60000,
        // keepAliveTimeout: 300000
    }),
    pool: {}
    // agentOptions: {
    //     maxSockets: 160,
    //     // maxFreeSockets: 10,
    //     timeout: 30000,
    //     keepAliveTimeout: 300000
    // }
});
placeOrderTransactionsRouter.use(authentication_1.default);
placeOrderTransactionsRouter.post('/start', permitScopes_1.default(['transactions']), (req, _, next) => {
    req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required').isISO8601();
    req.checkBody('seller_identifier', 'invalid seller_identifier').notEmpty().withMessage('seller_identifier is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transaction = yield ttts.service.transaction.placeOrderInProgress.start({
            expires: moment(req.body.expires).toDate(),
            agentId: req.user.sub,
            sellerIdentifier: req.body.seller_identifier,
            clientUser: req.user,
            purchaserGroup: req.body.purchaser_group
        })(new ttts.repository.Transaction(ttts.mongoose.connection), new ttts.repository.Organization(ttts.mongoose.connection));
        // tslint:disable-next-line:no-string-literal
        // const host = req.headers['host'];
        // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
        res.status(http_status_1.CREATED).json(transaction);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put('/:transactionId/customerContact', permitScopes_1.default(['transactions']), (req, _, next) => {
    req.checkBody('last_name').notEmpty().withMessage('required');
    req.checkBody('first_name').notEmpty().withMessage('required');
    req.checkBody('tel').notEmpty().withMessage('required');
    req.checkBody('email').notEmpty().withMessage('required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const contact = yield ttts.service.transaction.placeOrderInProgress.setCustomerContact(req.user.sub, req.params.transactionId, {
            last_name: req.body.last_name,
            first_name: req.body.first_name,
            email: req.body.email,
            tel: req.body.tel,
            age: (req.body.age !== undefined) ? req.body.age : '',
            address: (req.body.address !== undefined) ? req.body.address : '',
            gender: (req.body.gender !== undefined) ? req.body.gender : ''
        })(new ttts.repository.Transaction(ttts.mongoose.connection));
        res.status(http_status_1.CREATED).json(contact);
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
        const action = yield ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(req.user.sub, req.params.transactionId, req.body.performance_id, req.body.offers.map((offer) => {
            return {
                ticket_type: offer.ticket_type,
                watcher_name: offer.watcher_name
            };
        }))(new ttts.repository.Transaction(ttts.mongoose.connection), new ttts.repository.Performance(ttts.mongoose.connection), new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection), new ttts.repository.PaymentNo(redisClient), new ttts.repository.rateLimit.TicketTypeCategory(redisClient));
        res.status(http_status_1.CREATED).json(action);
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
        yield ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(req.user.sub, req.params.transactionId, req.params.actionId)(new ttts.repository.Transaction(ttts.mongoose.connection), new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection), new ttts.repository.rateLimit.TicketTypeCategory(redisClient));
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/creditCard', permitScopes_1.default(['transactions']), (req, __2, next) => {
    req.checkBody('orderId', 'invalid orderId').notEmpty().withMessage('orderId is required');
    req.checkBody('amount', 'invalid amount').notEmpty().withMessage('amount is required');
    req.checkBody('method', 'invalid method').notEmpty().withMessage('gmo_order_id is required');
    req.checkBody('creditCard', 'invalid creditCard').notEmpty().withMessage('gmo_amount is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 会員IDを強制的にログイン中の人物IDに変更
        const creditCard = Object.assign({}, req.body.creditCard, {
            memberId: (req.user.username !== undefined) ? req.user.sub : undefined
        });
        debug('authorizing credit card...', creditCard);
        debug('authorizing credit card...', req.body.creditCard);
        const action = yield ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(req.user.sub, req.params.transactionId, req.body.orderId, req.body.amount, req.body.method, creditCard)(new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection), new ttts.repository.Organization(ttts.mongoose.connection), new ttts.repository.Transaction(ttts.mongoose.connection), creditService);
        res.status(http_status_1.CREATED).json({
            id: action.id
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * クレジットカードオーソリ取消
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/creditCard/:actionId', permitScopes_1.default(['transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield ttts.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(req.user.sub, req.params.transactionId, req.params.actionId)(new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection), new ttts.repository.Transaction(ttts.mongoose.connection), creditService);
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transactionResult = yield ttts.service.transaction.placeOrderInProgress.confirm({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            paymentMethod: req.body.payment_method
        })(new ttts.repository.Transaction(ttts.mongoose.connection), new ttts.repository.action.authorize.CreditCard(ttts.mongoose.connection), new ttts.repository.action.authorize.SeatReservation(ttts.mongoose.connection), new ttts.repository.Token(redisClient));
        debug('transaction confirmed.');
        res.status(http_status_1.CREATED).json(transactionResult);
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/tasks/sendEmailNotification', permitScopes_1.default(['transactions']), (req, __2, next) => {
    req.checkBody('sender.name', 'invalid sender').notEmpty().withMessage('sender.name is required');
    req.checkBody('sender.email', 'invalid sender').notEmpty().withMessage('sender.email is required');
    req.checkBody('toRecipient.name', 'invalid toRecipient').notEmpty().withMessage('toRecipient.name is required');
    req.checkBody('toRecipient.email', 'invalid toRecipient').notEmpty().withMessage('toRecipient.email is required').isEmail();
    req.checkBody('about', 'invalid about').notEmpty().withMessage('about is required');
    req.checkBody('text', 'invalid text').notEmpty().withMessage('text is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const task = yield ttts.service.transaction.placeOrder.sendEmail(req.params.transactionId, {
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
        })(new ttts.repository.Task(ttts.mongoose.connection), new ttts.repository.Transaction(ttts.mongoose.connection));
        res.status(http_status_1.CREATED).json(task);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placeOrderTransactionsRouter;
