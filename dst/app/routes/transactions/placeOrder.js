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
const moment = require("moment");
const placeOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
const debug = createDebug('ttts-api:placeOrderTransactionsRouter');
placeOrderTransactionsRouter.use(authentication_1.default);
placeOrderTransactionsRouter.post('/start', permitScopes_1.default(['transactions']), (req, _, next) => {
    req.checkBody('expires', 'invalid expires').notEmpty().withMessage('expires is required').isISO8601();
    req.checkBody('seller_id', 'invalid sellerId').notEmpty().withMessage('seller_id is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transaction = yield ttts.service.transaction.placeOrderInProgress.start({
            expires: moment(req.body.expires).toDate(),
            agentId: req.user.sub,
            sellerId: req.body.seller_id,
            purchaserGroup: req.body.purchaser_group
        });
        // tslint:disable-next-line:no-string-literal
        // const host = req.headers['host'];
        // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
        res.json(transaction);
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
    req.checkBody('gender').notEmpty().withMessage('required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const contact = yield ttts.service.transaction.placeOrderInProgress.setCustomerContact(req.user.sub, req.params.transactionId, {
            last_name: req.body.last_name,
            first_name: req.body.first_name,
            email: req.body.email,
            tel: req.body.tel,
            age: '',
            address: '',
            gender: req.body.gender
        });
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
        const action = yield ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create(req.user.sub, req.params.transactionId, req.body.perfomance_id, req.body.offers.map((offer) => {
            return {
                extra: offer.extra.map((extra) => {
                    return {
                        ticket_type: extra.ticket_type,
                        ticketCount: extra.ticket_count,
                        updated: true
                    };
                }),
                ticket_type: offer.ticket_type,
                ticket_type_name: offer.ticket_type_name,
                ticket_type_charge: offer.ticket_type_charge,
                watcher_name: '',
                ticket_cancel_charge: [],
                ticket_ttts_extension: {
                    category: '',
                    required_seat_num: 1,
                    csv_code: ''
                },
                performance_ttts_extension: {}
            };
        }));
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
        yield ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel(req.user.sub, req.params.transactionId, req.params.actionId);
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const order = yield ttts.service.transaction.placeOrderInProgress.confirm({
            agentId: req.user.sub,
            transactionId: req.params.transactionId,
            paymentMethod: req.body.payment_method
        });
        debug('transaction confirmed', order);
        res.status(http_status_1.CREATED).json(order);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placeOrderTransactionsRouter;
