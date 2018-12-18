"use strict";
/**
 * orders router
 * @module ordersRouter
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
const express_1 = require("express");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
// 車椅子レート制限のためのRedis接続クライアント
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
const ordersRouter = express_1.Router();
ordersRouter.use(authentication_1.default);
/**
 * make inquiry of an order
 */
ordersRouter.post('/findByOrderInquiryKey', permitScopes_1.default(['orders', 'orders.read-only']), (req, _, next) => {
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
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const key = {
            performanceDay: req.body.performanceDay,
            paymentNo: req.body.paymentNo,
            telephone: req.body.telephone
        };
        const repository = new ttts.repository.Order(ttts.mongoose.connection);
        const order = yield repository.findByOrderInquiryKey(key);
        // バウチャー印刷トークンを発行
        const tokenRepo = new ttts.repository.Token(redisClient);
        const reservationIds = order.acceptedOffers
            .filter((o) => o.itemOffered.status === ttts.factory.reservationStatusType.ReservationConfirmed)
            .map((o) => o.itemOffered.id);
        const printToken = yield tokenRepo.createPrintToken(reservationIds);
        res.json(Object.assign({}, order, { printToken: printToken }));
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 注文検索
 */
ordersRouter.get('', permitScopes_1.default(['admin']), (req, __2, next) => {
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
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const orderRepo = new ttts.repository.Order(ttts.mongoose.connection);
        const searchConditions = Object.assign({}, req.query, { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100, page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1, sort: (req.query.sort !== undefined) ? req.query.sort : { orderDate: ttts.factory.sortType.Descending } });
        const orders = yield orderRepo.search(searchConditions);
        const totalCount = yield orderRepo.count(searchConditions);
        res.set('X-Total-Count', totalCount.toString());
        res.json(orders);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = ordersRouter;
