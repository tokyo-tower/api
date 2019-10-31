/**
 * ウェブフックルーター
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import * as mongoose from 'mongoose';

const webhooksRouter = express.Router();

import { NO_CONTENT } from 'http-status';

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

/**
 * 注文イベント
 */
webhooksRouter.post(
    '/onPlaceOrder',
    async (req, res, next) => {
        try {
            const order = <cinerinoapi.factory.order.IOrder>req.body.data;

            if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
                const taskRepo = new ttts.repository.Task(mongoose.connection);

                const taskAttribute: ttts.factory.task.createPlaceOrderReport.IAttributes = {
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
 * 注文返品イベント
 */
webhooksRouter.post(
    '/onReturnOrder',
    async (req, res, next) => {
        try {
            const order = <cinerinoapi.factory.order.IOrder>req.body.data;

            if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
                const performanceRepo = new ttts.repository.Performance(mongoose.connection);
                const taskRepo = new ttts.repository.Task(mongoose.connection);

                const taskAttribute: ttts.factory.task.createReturnOrderReport.IAttributes = {
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

                await taskRepo.save(<any>taskAttribute);

                await ttts.service.performance.onOrderReturned(order)({
                    performance: performanceRepo
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
 * 予約確定イベント
 * @deprecated Use /onReservationStatusChanged
 */
webhooksRouter.post(
    '/onReservationConfirmed',
    (_, res) => {
        res.status(NO_CONTENT)
            .end();
    }
);

/**
 * 予約取消イベント
 * @deprecated Use /onReservationStatusChanged
 */
webhooksRouter.post(
    '/onReservationCancelled',
    (_, res) => {
        res.status(NO_CONTENT)
            .end();
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
                const ticketTypeCategoryRateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);

                await ttts.service.reserve.onReservationStatusChanged(reservation)({
                    reservation: reservationRepo,
                    task: taskRepo,
                    ticketTypeCategoryRateLimit: ticketTypeCategoryRateLimitRepo
                });
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default webhooksRouter;
