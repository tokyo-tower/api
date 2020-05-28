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
 * ウェブフックルーター
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const ttts = require("@tokyotower/domain");
const express = require("express");
const mongoose = require("mongoose");
const webhooksRouter = express.Router();
const http_status_1 = require("http-status");
// const redisClient = ttts.redis.createClient({
//     host: <string>process.env.REDIS_HOST,
//     port: Number(<string>process.env.REDIS_PORT),
//     password: <string>process.env.REDIS_KEY,
//     tls: { servername: <string>process.env.REDIS_HOST }
// });
/**
 * 注文返金イベント
 * 購入者による手数料あり返品の場合に発生
 */
webhooksRouter.post('/onReturnOrder', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = req.body.data;
        if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
            const aggregateSalesRepo = new ttts.repository.AggregateSale(mongoose.connection);
            yield ttts.service.aggregate.report4sales.createRefundOrderReport({
                order: order
            })(aggregateSalesRepo);
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 注文ステータス変更イベント
 */
webhooksRouter.post('/onOrderStatusChanged', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = req.body.data;
        const taskRepo = new ttts.repository.Task(mongoose.connection);
        const performanceRepo = new ttts.repository.Performance(mongoose.connection);
        if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
            switch (order.orderStatus) {
                case cinerinoapi.factory.orderStatus.OrderProcessing:
                    const createPlaceOrderReportTask = {
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
                    yield taskRepo.save(createPlaceOrderReportTask);
                    break;
                case cinerinoapi.factory.orderStatus.OrderDelivered:
                    break;
                case cinerinoapi.factory.orderStatus.OrderReturned:
                    // 返品レポート作成
                    const createReturnOrderReportTask = {
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
                    yield taskRepo.save(createReturnOrderReportTask);
                    yield ttts.service.performance.onOrderReturned(order)({
                        performance: performanceRepo
                    });
                    break;
                default:
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
 * 予約ステータス変更イベント
 */
webhooksRouter.post('/onReservationStatusChanged', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reservation = req.body.data;
        if (reservation !== undefined
            && reservation !== null
            && typeof reservation.id === 'string'
            && typeof reservation.reservationNumber === 'string') {
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            // const ticketTypeCategoryRateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            yield ttts.service.reserve.onReservationStatusChanged(reservation)({
                reservation: reservationRepo,
                task: taskRepo
                // ticketTypeCategoryRateLimit: ticketTypeCategoryRateLimitRepo
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
 * イベント変更イベント
 */
webhooksRouter.post('/onEventChanged', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const event = req.body.data;
        const taskRepo = new ttts.repository.Task(mongoose.connection);
        if (typeof event.id === 'string' && typeof event.eventStatus === 'string') {
            // イベント更新処理
            const task = {
                name: 'importEvent',
                project: { typeOf: cinerinoapi.factory.organizationType.Project, id: event.project.id },
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 2,
                numberOfTried: 0,
                executionResults: [],
                data: event
            };
            yield taskRepo.save(task);
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = webhooksRouter;
