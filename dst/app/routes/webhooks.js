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
webhooksRouter.post('/onPlaceOrder', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const order = req.body.data;
        if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const taskAttribute = {
                name: ttts.factory.taskName.CreatePlaceOrderReport,
                project: req.project,
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
webhooksRouter.post('/onReturnOrder', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const order = req.body.data;
        if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const taskAttribute = {
                name: ttts.factory.taskName.CreateReturnOrderReport,
                project: req.project,
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
                    project: req.project,
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
exports.default = webhooksRouter;
