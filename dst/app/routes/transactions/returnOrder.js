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
 * 注文返品取引ルーター
 */
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
// tslint:disable-next-line:no-submodule-imports
const check_1 = require("express-validator/check");
const http_status_1 = require("http-status");
const mongoose = require("mongoose");
const PROJECT_ID = process.env.PROJECT_ID;
const returnOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
returnOrderTransactionsRouter.use(authentication_1.default);
/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post('/confirm', permitScopes_1.default(['transactions']), (req, __, next) => {
    req.checkBody('performance_day', 'invalid performance_day')
        .notEmpty()
        .withMessage('performance_day is required');
    req.checkBody('payment_no', 'invalid payment_no')
        .notEmpty()
        .withMessage('payment_no is required');
    req.checkBody('cancellation_fee', 'invalid cancellation_fee')
        .notEmpty()
        .withMessage('cancellation_fee is required')
        .isInt();
    req.checkBody('forcibly', 'invalid forcibly')
        .notEmpty()
        .withMessage('forcibly is required')
        .isBoolean();
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const invoiceRepo = new ttts.repository.Invoice(mongoose.connection);
        const orderRepo = new ttts.repository.Order(mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(mongoose.connection);
        // 確認番号で注文検索
        const confirmationNumber = `${req.body.performance_day}${req.body.payment_no}`;
        const orders = yield orderRepo.search({
            limit: 1,
            confirmationNumbers: [confirmationNumber],
            project: { ids: [PROJECT_ID] }
        });
        const order = orders.shift();
        if (order === undefined) {
            throw new ttts.factory.errors.NotFound('Order');
        }
        // 注文取引を検索する
        const placeOrderTransactions = yield transactionRepo.search({
            limit: 1,
            typeOf: ttts.factory.transactionType.PlaceOrder,
            result: { order: { orderNumbers: [order.orderNumber] } }
        });
        const placeOrderTransaction = placeOrderTransactions.shift();
        if (placeOrderTransaction === undefined) {
            throw new ttts.factory.errors.NotFound('Transaction');
        }
        // 取引があれば、返品取引確定
        const returnOrderTransaction = yield ttts.service.transaction.returnOrder.confirm({
            clientUser: req.user,
            agentId: req.user.sub,
            transactionId: placeOrderTransaction.id,
            cancellationFee: req.body.cancellation_fee,
            forcibly: req.body.forcibly,
            reason: ttts.factory.transaction.returnOrder.Reason.Customer,
            potentialActions: {
                returnOrder: {
                    potentialActions: {
                        informOrder: [
                            { recipient: { url: `${req.protocol}://${req.hostname}/webhooks/onReturnOrder` } }
                        ]
                    }
                }
            }
        })({
            invoice: invoiceRepo,
            transaction: transactionRepo
        });
        res.status(http_status_1.CREATED)
            .json({
            id: returnOrderTransaction.id
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 返品メール送信
 */
returnOrderTransactionsRouter.post('/:transactionId/tasks/sendEmailNotification', permitScopes_1.default(['transactions']), (req, __2, next) => {
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
        const task = yield ttts.service.transaction.returnOrder.sendEmail(req.params.transactionId, {
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
returnOrderTransactionsRouter.get('', permitScopes_1.default(['admin']), ...[
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
            limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100, page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1, sort: (req.query.sort !== undefined) ? req.query.sort : { orderDate: ttts.factory.sortType.Descending }, typeOf: ttts.factory.transactionType.ReturnOrder });
        const transactions = yield transactionRepo.search(searchConditions);
        const totalCount = yield transactionRepo.count(searchConditions);
        res.set('X-Total-Count', totalCount.toString());
        res.json(transactions);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = returnOrderTransactionsRouter;
