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
            })({ aggregateSale: reportRepo });
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
                    })(reportRepo);
                    // 非同期の場合はこちら↓
                    // const createPlaceOrderReportTask: ttts.factory.task.createPlaceOrderReport.IAttributes = {
                    //     name: <any>ttts.factory.taskName.CreatePlaceOrderReport,
                    //     project: { typeOf: order.project.typeOf, id: order.project.id },
                    //     status: ttts.factory.taskStatus.Ready,
                    //     runsAt: new Date(), // なるはやで実行
                    //     remainingNumberOfTries: 10,
                    //     numberOfTried: 0,
                    //     executionResults: [],
                    //     data: {
                    //         order: order
                    //     }
                    // };
                    // await taskRepo.save(<any>createPlaceOrderReportTask);
                    break;
                case cinerinoapi.factory.orderStatus.OrderDelivered:
                    break;
                case cinerinoapi.factory.orderStatus.OrderReturned:
                    // 返品レポート作成
                    yield ttts.service.report.order.createReturnOrderReport({
                        order: order
                    })({ aggregateSale: reportRepo });
                    // 非同期の場合はこちら↓
                    // const createReturnOrderReportTask: ttts.factory.task.createReturnOrderReport.IAttributes = {
                    //     name: <any>ttts.factory.taskName.CreateReturnOrderReport,
                    //     project: { typeOf: order.project.typeOf, id: order.project.id },
                    //     status: ttts.factory.taskStatus.Ready,
                    //     runsAt: new Date(), // なるはやで実行
                    //     remainingNumberOfTries: 10,
                    //     numberOfTried: 0,
                    //     executionResults: [],
                    //     data: {
                    //         order: order
                    //     }
                    // };
                    // await taskRepo.save(<any>createReturnOrderReportTask);
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
            yield ttts.service.performance.importFromCinerino(event)({
                performance: performanceRepo,
                task: taskRepo
            });
            // 非同期の場合こちら↓
            // const task: ttts.factory.task.IAttributes<any> = {
            //     name: <any>'importEvent',
            //     project: { typeOf: cinerinoapi.factory.chevre.organizationType.Project, id: event.project.id },
            //     status: ttts.factory.taskStatus.Ready,
            //     runsAt: new Date(),
            //     remainingNumberOfTries: 2,
            //     numberOfTried: 0,
            //     executionResults: [],
            //     data: event
            // };
            // await taskRepo.save(task);
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = webhooksRouter;
