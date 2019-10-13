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
 * ウェブフックルーター
 */
const ttts = require("@tokyotower/domain");
const express = require("express");
const moment = require("moment");
const mongoose = require("mongoose");
const webhooksRouter = express.Router();
const http_status_1 = require("http-status");
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
/**
 * 取引ステータス変更イベント
 */
webhooksRouter.post('/onTransactionStatusChanged', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transaction = req.body.data;
        if (transaction !== undefined && transaction !== null) {
            if (transaction.typeOf === ttts.factory.transactionType.PlaceOrder && typeof transaction.id === 'string') {
                const actionRepo = new ttts.repository.Action(mongoose.connection);
                const taskRepo = new ttts.repository.Task(mongoose.connection);
                const ticketTypeCategoryRateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
                switch (transaction.status) {
                    case ttts.factory.transactionStatusType.Confirmed:
                        break;
                    case ttts.factory.transactionStatusType.Canceled:
                    case ttts.factory.transactionStatusType.Expired:
                        // 取引が成立しなかった場合の処理
                        yield ttts.service.stock.onTransactionVoided({
                            project: { id: transaction.project.id },
                            typeOf: transaction.typeOf,
                            id: transaction.id
                        })({
                            action: actionRepo,
                            task: taskRepo,
                            ticketTypeCategoryRateLimit: ticketTypeCategoryRateLimitRepo
                        });
                        break;
                    default:
                }
            }
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 注文イベント
 */
webhooksRouter.post('/onPlaceOrder', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const order = req.body.data;
        if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const taskAttribute = {
                name: ttts.factory.taskName.CreatePlaceOrderReport,
                project: { typeOf: order.project.typeOf, id: order.project.id },
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 10,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    order: order
                }
            };
            yield taskRepo.save(taskAttribute);
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 注文返品イベント
 */
webhooksRouter.post('/onReturnOrder', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const order = req.body.data;
        if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
            const orderRepo = new ttts.repository.Order(mongoose.connection);
            const performanceRepo = new ttts.repository.Performance(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const transactionRepo = new ttts.repository.Transaction(mongoose.connection);
            const taskAttribute = {
                name: ttts.factory.taskName.CreateReturnOrderReport,
                project: { typeOf: order.project.typeOf, id: order.project.id },
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 10,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    order: order
                }
            };
            yield taskRepo.save(taskAttribute);
            yield ttts.service.performance.onOrderReturned({ orderNumber: order.orderNumber })({
                order: orderRepo,
                performance: performanceRepo,
                transaction: transactionRepo
            });
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 予約確定イベント
 */
webhooksRouter.post('/onReservationConfirmed', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const reservation = req.body.data;
        if (reservation !== undefined
            && reservation !== null
            && typeof reservation.id === 'string'
            && typeof reservation.reservationNumber === 'string') {
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            // 余分確保分を除く
            let extraProperty;
            if (reservation.additionalProperty !== undefined) {
                extraProperty = reservation.additionalProperty.find((p) => p.name === 'extra');
            }
            const isExtra = extraProperty !== undefined && extraProperty.value === '1';
            if (!isExtra) {
                // 余分確保分でなければ予約データを作成する
                const tttsResevation = Object.assign({}, reservation, { reservationFor: Object.assign({}, reservation.reservationFor, { doorTime: (reservation.reservationFor.doorTime !== undefined)
                            ? moment(reservation.reservationFor.doorTime)
                                .toDate()
                            : undefined, endDate: moment(reservation.reservationFor.endDate)
                            .toDate(), startDate: moment(reservation.reservationFor.startDate)
                            .toDate() }), checkins: [] });
                yield reservationRepo.saveEventReservation(tttsResevation);
                // 集計タスク作成
                const task = {
                    name: ttts.factory.taskName.AggregateEventReservations,
                    project: { typeOf: reservation.project.typeOf, id: reservation.project.id },
                    status: ttts.factory.taskStatus.Ready,
                    runsAt: new Date(),
                    remainingNumberOfTries: 3,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        id: reservation.reservationFor.id
                    }
                };
                yield taskRepo.save(task);
            }
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 予約取消イベント
 */
webhooksRouter.post('/onReservationCancelled', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const reservation = req.body.data;
        if (reservation !== undefined
            && reservation !== null
            && typeof reservation.id === 'string'
            && typeof reservation.reservationNumber === 'string') {
            // 余分確保分を除く
            let extraProperty;
            if (reservation.additionalProperty !== undefined) {
                extraProperty = reservation.additionalProperty.find((p) => p.name === 'extra');
            }
            const isExtra = extraProperty !== undefined && extraProperty.value === '1';
            if (!isExtra) {
                yield ttts.service.reserve.cancelReservation({ id: reservation.id })({
                    reservation: new ttts.repository.Reservation(mongoose.connection),
                    task: new ttts.repository.Task(mongoose.connection),
                    ticketTypeCategoryRateLimit: new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
                    project: new ttts.repository.Project(mongoose.connection)
                });
            }
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = webhooksRouter;
