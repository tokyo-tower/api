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
            const performanceRepo = new ttts.repository.Performance(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);
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
            yield ttts.service.performance.onOrderReturned(order)({
                performance: performanceRepo
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
webhooksRouter.post('/onReservationConfirmed', (_, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // const reservation
        //     = <ttts.factory.chevre.reservation.IReservation<ttts.factory.chevre.reservationType.EventReservation>>req.body.data;
        // if (reservation !== undefined
        //     && reservation !== null
        //     && typeof reservation.id === 'string'
        //     && typeof reservation.reservationNumber === 'string') {
        //     const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        //     const taskRepo = new ttts.repository.Task(mongoose.connection);
        //     const ticketTypeCategoryRateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
        //     await ttts.service.reserve.onReservationStatusChanged(reservation)({
        //         reservation: reservationRepo,
        //         task: taskRepo,
        //         ticketTypeCategoryRateLimit: ticketTypeCategoryRateLimitRepo
        //     });
        // }
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
/**
 * 予約ステータス変更イベント
 */
webhooksRouter.post('/onReservationStatusChanged', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const reservation = req.body.data;
        if (reservation !== undefined
            && reservation !== null
            && typeof reservation.id === 'string'
            && typeof reservation.reservationNumber === 'string') {
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const ticketTypeCategoryRateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
            yield ttts.service.reserve.onReservationStatusChanged(reservation)({
                reservation: reservationRepo,
                task: taskRepo,
                ticketTypeCategoryRateLimit: ticketTypeCategoryRateLimitRepo
            });
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = webhooksRouter;
