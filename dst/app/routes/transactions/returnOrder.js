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
}, validator_1.default, 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const actionRepo = new ttts.repository.Action(mongoose.connection);
        const invoiceRepo = new ttts.repository.Invoice(mongoose.connection);
        const orderRepo = new ttts.repository.Order(mongoose.connection);
        const sellerRepo = new ttts.repository.Seller(mongoose.connection);
        const transactionRepo = new ttts.repository.Transaction(mongoose.connection);
        // 確認番号で注文検索
        const confirmationNumber = `${req.body.performance_day}${req.body.payment_no}`;
        const orders = yield orderRepo.search({
            limit: 1,
            confirmationNumbers: [confirmationNumber],
            project: { ids: [req.project.id] }
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
        // tslint:disable-next-line:max-line-length
        const authorizeSeatReservationActions = placeOrderTransaction.object.authorizeActions
            .filter((a) => a.object.typeOf === ttts.factory.cinerino.action.authorize.offer.seatReservation.ObjectType.SeatReservation)
            .filter((a) => a.actionStatus === ttts.factory.actionStatusType.CompletedActionStatus);
        const informOrderUrl = `${req.protocol}://${req.hostname}/webhooks/onReturnOrder`;
        const informReservationUrl = `${req.protocol}://${req.hostname}/webhooks/onReservationCancelled`;
        const actionsOnOrder = yield actionRepo.searchByOrderNumber({ orderNumber: order.orderNumber });
        const payActions = actionsOnOrder
            .filter((a) => a.typeOf === ttts.factory.actionType.PayAction)
            .filter((a) => a.actionStatus === ttts.factory.actionStatusType.CompletedActionStatus);
        const emailCustomization = getEmailCustomization({
            placeOrderTransaction: placeOrderTransaction,
            reason: ttts.factory.transaction.returnOrder.Reason.Customer
        });
        // クレジットカード返金アクション
        const refundCreditCardActionsParams = yield Promise.all(payActions
            .filter((a) => a.object[0].paymentMethod.typeOf === ttts.factory.paymentMethodType.CreditCard)
            // tslint:disable-next-line:max-line-length
            .map((a) => __awaiter(this, void 0, void 0, function* () {
            return {
                object: {
                    object: a.object.map((o) => {
                        return {
                            paymentMethod: {
                                paymentMethodId: o.paymentMethod.paymentMethodId
                            }
                        };
                    })
                },
                potentialActions: {
                    sendEmailMessage: Object.assign({}, (emailCustomization !== undefined)
                        ? { object: emailCustomization }
                        : undefined),
                    // クレジットカード返金後に注文通知
                    informOrder: [
                        { recipient: { url: informOrderUrl } }
                    ]
                }
            };
        })));
        const confirmReservationParams = authorizeSeatReservationActions.map((authorizeSeatReservationAction) => {
            if (authorizeSeatReservationAction.result === undefined) {
                throw new ttts.factory.errors.NotFound('Result of seat reservation authorize action');
            }
            const reserveTransaction = authorizeSeatReservationAction.result.responseBody;
            return {
                object: {
                    typeOf: reserveTransaction.typeOf,
                    id: reserveTransaction.id
                },
                potentialActions: {
                    cancelReservation: {
                        potentialActions: {
                            informReservation: [
                                { recipient: { url: informReservationUrl } }
                            ]
                        }
                    }
                }
            };
        });
        // 注文通知パラメータを生成
        const informOrderParams = [];
        // 取引があれば、返品取引確定
        const returnOrderTransaction = yield ttts.service.transaction.returnOrder.confirm4ttts({
            project: req.project,
            clientUser: req.user,
            agentId: req.user.sub,
            transactionId: placeOrderTransaction.id,
            cancellationFee: req.body.cancellation_fee,
            forcibly: req.body.forcibly,
            reason: ttts.factory.transaction.returnOrder.Reason.Customer,
            potentialActions: {
                returnOrder: {
                    potentialActions: {
                        cancelReservation: confirmReservationParams,
                        informOrder: informOrderParams,
                        refundCreditCard: refundCreditCardActionsParams
                    }
                }
            }
        })({
            action: actionRepo,
            invoice: invoiceRepo,
            seller: sellerRepo,
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
function getEmailCustomization(params) {
    // const placeOrderTransaction = returnOrderTransaction.object.transaction;
    if (params.placeOrderTransaction.result === undefined) {
        throw new ttts.factory.errors.NotFound('PlaceOrder Transaction Result');
    }
    // const order = params.placeOrderTransaction.result.order;
    // let emailMessageAttributes: ttts.factory.creativeWork.message.email.IAttributes;
    const emailMessage = undefined;
    switch (params.reason) {
        case ttts.factory.transaction.returnOrder.Reason.Customer:
            // no op
            break;
        case ttts.factory.transaction.returnOrder.Reason.Seller:
            // tslint:disable-next-line:no-suspicious-comment
            // TODO 二重送信対策
            // emailMessageAttributes = await createEmailMessage4sellerReason(params.placeOrderTransaction);
            // emailMessage = {
            //     typeOf: ttts.factory.creativeWorkType.EmailMessage,
            //     identifier: `returnOrderTransaction-${order.orderNumber}`,
            //     name: `returnOrderTransaction-${order.orderNumber}`,
            //     sender: {
            //         typeOf: params.placeOrderTransaction.seller.typeOf,
            //         name: emailMessageAttributes.sender.name,
            //         email: emailMessageAttributes.sender.email
            //     },
            //     toRecipient: {
            //         typeOf: params.placeOrderTransaction.agent.typeOf,
            //         name: emailMessageAttributes.toRecipient.name,
            //         email: emailMessageAttributes.toRecipient.email
            //     },
            //     about: emailMessageAttributes.about,
            //     text: emailMessageAttributes.text
            // };
            break;
        default:
    }
    return emailMessage;
}
exports.getEmailCustomization = getEmailCustomization;
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
