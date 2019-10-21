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
 * 注文返品取引ルーター(POS専用)
 */
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const mongoose = require("mongoose");
const returnOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
returnOrderTransactionsRouter.use(authentication_1.default);
/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post('/confirm', permitScopes_1.default(['pos', 'transactions']), (req, __, next) => {
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
    next();
}, validator_1.default, 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const actionRepo = new ttts.repository.Action(mongoose.connection);
        const invoiceRepo = new ttts.repository.Invoice(mongoose.connection);
        const orderRepo = new ttts.repository.Order(mongoose.connection);
        const projectRepo = new ttts.repository.Project(mongoose.connection);
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
        const informReservationUrl = `${req.protocol}://${req.hostname}/webhooks/onReservationCancelled`;
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
        const expires = moment()
            .add(1, 'minute')
            .toDate();
        const potentialActionParams = {
            returnOrder: {
                potentialActions: {
                    cancelReservation: confirmReservationParams,
                    informOrder: informOrderParams,
                    refundCreditCard: []
                }
            }
        };
        // 取引があれば、返品取引進行
        const returnOrderTransaction = yield ttts.service.transaction.returnOrder.start({
            project: req.project,
            agent: req.agent,
            expires: expires,
            object: {
                cancellationFee: Number(req.body.cancellation_fee),
                clientUser: req.user,
                order: { orderNumber: order.orderNumber },
                reason: ttts.factory.transaction.returnOrder.Reason.Customer
            },
            seller: { typeOf: order.seller.typeOf, id: order.seller.id }
        })({
            action: actionRepo,
            invoice: invoiceRepo,
            order: orderRepo,
            project: projectRepo,
            seller: sellerRepo,
            transaction: transactionRepo
        });
        yield ttts.service.transaction.returnOrder.confirm({
            id: returnOrderTransaction.id,
            potentialActions: potentialActionParams
        })({
            action: actionRepo,
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
exports.default = returnOrderTransactionsRouter;
