/**
 * ウェブフックルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import * as mongoose from 'mongoose';

const webhooksRouter = express.Router();

import { NO_CONTENT } from 'http-status';

/**
 * 注文返金イベント
 * 購入者による手数料あり返品の場合に発生
 */
webhooksRouter.post(
    '/onReturnOrder',
    async (req, res, next) => {
        try {
            const order = <cinerinoapi.factory.order.IOrder>req.body.data;

            if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
                const aggregateSalesRepo = new ttts.repository.AggregateSale(mongoose.connection);

                await ttts.service.aggregate.report4sales.createRefundOrderReport({
                    order: order
                })({ aggregateSale: aggregateSalesRepo });
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 注文ステータス変更イベント
 */
webhooksRouter.post(
    '/onOrderStatusChanged',
    async (req, res, next) => {
        try {
            const order = <cinerinoapi.factory.order.IOrder>req.body.data;

            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const performanceRepo = new ttts.repository.Performance(mongoose.connection);

            if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
                switch (order.orderStatus) {
                    case cinerinoapi.factory.orderStatus.OrderProcessing:
                        const createPlaceOrderReportTask: ttts.factory.task.createPlaceOrderReport.IAttributes = {
                            name: <any>ttts.factory.taskName.CreatePlaceOrderReport,
                            project: { typeOf: order.project.typeOf, id: order.project.id },
                            status: ttts.factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                order: order
                            }
                        };

                        await taskRepo.save(<any>createPlaceOrderReportTask);

                        break;

                    case cinerinoapi.factory.orderStatus.OrderDelivered:
                        break;

                    case cinerinoapi.factory.orderStatus.OrderReturned:
                        // 返品レポート作成
                        const createReturnOrderReportTask: ttts.factory.task.createReturnOrderReport.IAttributes = {
                            name: <any>ttts.factory.taskName.CreateReturnOrderReport,
                            project: { typeOf: order.project.typeOf, id: order.project.id },
                            status: ttts.factory.taskStatus.Ready,
                            runsAt: new Date(), // なるはやで実行
                            remainingNumberOfTries: 10,
                            numberOfTried: 0,
                            executionResults: [],
                            data: {
                                order: order
                            }
                        };

                        await taskRepo.save(<any>createReturnOrderReportTask);

                        await ttts.service.performance.onOrderReturned(order)({
                            performance: performanceRepo
                        });

                        break;

                    default:
                }
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 予約ステータス変更イベント
 */
webhooksRouter.post(
    '/onReservationStatusChanged',
    async (req, res, next) => {
        try {
            const reservation
                = <ttts.factory.chevre.reservation.IReservation<ttts.factory.chevre.reservationType.EventReservation>>req.body.data;

            if (reservation !== undefined
                && reservation !== null
                && typeof reservation.id === 'string'
                && typeof reservation.reservationNumber === 'string') {
                const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
                const taskRepo = new ttts.repository.Task(mongoose.connection);

                await ttts.service.reserve.onReservationStatusChanged(reservation)({
                    reservation: reservationRepo,
                    task: taskRepo
                });
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * イベント変更イベント
 */
webhooksRouter.post(
    '/onEventChanged',
    async (req, res, next) => {
        try {
            const event = <ttts.factory.chevre.event.IEvent<ttts.factory.chevre.eventType.ScreeningEvent>>req.body.data;

            const taskRepo = new ttts.repository.Task(mongoose.connection);

            if (typeof event.id === 'string' && typeof event.eventStatus === 'string') {
                // イベント更新処理
                const task: ttts.factory.task.IAttributes<any> = {
                    name: <any>'importEvent',
                    project: { typeOf: cinerinoapi.factory.chevre.organizationType.Project, id: event.project.id },
                    status: ttts.factory.taskStatus.Ready,
                    runsAt: new Date(),
                    remainingNumberOfTries: 2,
                    numberOfTried: 0,
                    executionResults: [],
                    data: event
                };

                await taskRepo.save(task);
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default webhooksRouter;
