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
const returnOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
const debug = createDebug('ttts-api:returnOrderTransactionsRouter');
returnOrderTransactionsRouter.use(authentication_1.default);
/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post('/confirm', permitScopes_1.default(['transactions']), (req, __, next) => {
    req.checkBody('performance_day', 'invalid performance_day').notEmpty().withMessage('performance_day is required');
    req.checkBody('payment_no', 'invalid payment_no').notEmpty().withMessage('payment_no is required');
    req.checkBody('cancellation_fee', 'invalid cancellation_fee').notEmpty().withMessage('cancellation_fee is required').isInt();
    req.checkBody('forcibly', 'invalid forcibly').notEmpty().withMessage('forcibly is required').isBoolean();
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);
        // POS購入の取引を検索する
        const conditions = {
            typeOf: ttts.factory.transactionType.PlaceOrder,
            'agent.id': req.user.sub,
            'result.eventReservations.performance_day': req.body.performance_day,
            'result.eventReservations.payment_no': req.body.payment_no
        };
        debug('searching a transaction...', conditions);
        const placeOrderTransaction = yield transactionRepo.transactionModel.findOne(conditions).exec().then((doc) => {
            if (doc === null) {
                throw new ttts.factory.errors.NotFound('transaction');
            }
            return doc.toObject();
        });
        debug('placeOrder transaction found.');
        // 取引があれば、返品取引確定
        const returnOrderTransaction = yield ttts.service.transaction.returnOrder.confirm({
            agentId: req.user.sub,
            transactionId: placeOrderTransaction.id,
            cancellationFee: req.body.cancellation_fee,
            forcibly: req.body.forcibly,
            reason: ttts.factory.transaction.returnOrder.Reason.Customer
        })(transactionRepo);
        debug('returnOrder　transaction confirmed.');
        res.status(http_status_1.CREATED).json({
            id: returnOrderTransaction.id
        });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = returnOrderTransactionsRouter;
