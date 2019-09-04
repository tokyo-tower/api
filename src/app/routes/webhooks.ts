/**
 * ウェブフックルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import * as mongoose from 'mongoose';

const webhooksRouter = express.Router();

import { NO_CONTENT } from 'http-status';

webhooksRouter.post(
    '/onPlaceOrder',
    async (req, res, next) => {
        try {
            const order = req.body.data;

            if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
                const taskRepo = new ttts.repository.Task(mongoose.connection);

                const taskAttribute: ttts.factory.task.createPlaceOrderReport.IAttributes = {
                    name: <any>ttts.factory.taskName.CreatePlaceOrderReport,
                    status: ttts.factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        order: order
                    }
                };

                await taskRepo.save(<any>taskAttribute);
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

webhooksRouter.post(
    '/onReturnOrder',
    async (req, res, next) => {
        try {
            const order = req.body.data;

            if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
                const taskRepo = new ttts.repository.Task(mongoose.connection);

                const taskAttribute: ttts.factory.task.createReturnOrderReport.IAttributes = {
                    name: <any>ttts.factory.taskName.CreateReturnOrderReport,
                    status: ttts.factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        order: order
                    }
                };

                await taskRepo.save(<any>taskAttribute);
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 予約確定イベント
 */
webhooksRouter.post(
    '/onReservationConfirmed',
    async (req, res, next) => {
        try {
            const reservation = req.body.data;

            if (reservation !== undefined
                && reservation !== null
                && typeof reservation.id === 'string'
                && typeof reservation.reservationNumber === 'string') {
                const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
                const taskRepo = new ttts.repository.Task(mongoose.connection);

                // 予約データを作成する
                await reservationRepo.saveEventReservation({
                    ...reservation,
                    checkins: []
                });

                // 集計タスク作成
                const task: ttts.factory.task.aggregateEventReservations.IAttributes = {
                    name: <any>ttts.factory.taskName.AggregateEventReservations,
                    status: ttts.factory.taskStatus.Ready,
                    runsAt: new Date(),
                    remainingNumberOfTries: 3,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        id: reservation.reservationFor.id
                    }
                };
                await taskRepo.save(<any>task);
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default webhooksRouter;
