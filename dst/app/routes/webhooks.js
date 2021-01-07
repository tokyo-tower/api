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
const cinerinoapi = require("@cinerino/sdk");
const ttts = require("@tokyotower/domain");
const express = require("express");
const mongoose = require("mongoose");
const webhook_1 = require("../controllers/webhook");
const webhooksRouter = express.Router();
const http_status_1 = require("http-status");
/**
 * 注文返金イベント
 * 購入者による手数料あり返品の場合に発生
 */
webhooksRouter.post('/onReturnOrder', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = req.body.data;
        if (typeof (order === null || order === void 0 ? void 0 : order.orderNumber) === 'string') {
            const reportRepo = new ttts.repository.Report(mongoose.connection);
            yield ttts.service.report.order.createRefundOrderReport({
                order: order
            })({ report: reportRepo });
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
        const reportRepo = new ttts.repository.Report(mongoose.connection);
        // const taskRepo = new ttts.repository.Task(mongoose.connection);
        const performanceRepo = new ttts.repository.Performance(mongoose.connection);
        if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
            switch (order.orderStatus) {
                case cinerinoapi.factory.orderStatus.OrderProcessing:
                    yield ttts.service.report.order.createPlaceOrderReport({
                        order: order
                    })({ report: reportRepo });
                    break;
                case cinerinoapi.factory.orderStatus.OrderDelivered:
                    break;
                case cinerinoapi.factory.orderStatus.OrderReturned:
                    // 返品レポート作成
                    yield ttts.service.report.order.createReturnOrderReport({
                        order: order
                    })({ report: reportRepo });
                    yield webhook_1.onOrderReturned(order)({
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
        if (typeof (reservation === null || reservation === void 0 ? void 0 : reservation.id) === 'string' && typeof (reservation === null || reservation === void 0 ? void 0 : reservation.reservationNumber) === 'string') {
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            yield webhook_1.onReservationStatusChanged(reservation)({
                reservation: reservationRepo,
                task: taskRepo
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
        const performanceRepo = new ttts.repository.Performance(mongoose.connection);
        const taskRepo = new ttts.repository.Task(mongoose.connection);
        if (typeof (event === null || event === void 0 ? void 0 : event.id) === 'string' && typeof (event === null || event === void 0 ? void 0 : event.eventStatus) === 'string') {
            // イベント更新処理
            yield webhook_1.onEventChanged(event)({
                performance: performanceRepo,
                task: taskRepo
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
 * 予約使用アクション変更イベント
 */
webhooksRouter.post('/onActionStatusChanged', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const action 
        // tslint:disable-next-line:max-line-length
        = req.body.data;
        const reportRepo = new ttts.repository.Report(mongoose.connection);
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        if (typeof (action === null || action === void 0 ? void 0 : action.typeOf) === 'string') {
            yield webhook_1.onActionStatusChanged(action)({ report: reportRepo, reservation: reservationRepo });
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = webhooksRouter;
