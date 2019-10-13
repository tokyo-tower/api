/**
 * ウェブフックルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import * as moment from 'moment';
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
 * 取引ステータス変更イベント
 */
webhooksRouter.post(
    '/onTransactionStatusChanged',
    async (req, res, next) => {
        try {
            const transaction = <ttts.factory.transaction.ITransaction<ttts.factory.transactionType>>req.body.data;

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
                            await ttts.service.stock.onTransactionVoided({
                                project: { id: req.project.id },
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

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 注文イベント
 */
webhooksRouter.post(
    '/onPlaceOrder',
    async (req, res, next) => {
        try {
            const order = req.body.data;

            if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
                const taskRepo = new ttts.repository.Task(mongoose.connection);

                const taskAttribute: ttts.factory.task.createPlaceOrderReport.IAttributes = {
                    name: <any>ttts.factory.taskName.CreatePlaceOrderReport,
                    project: req.project,
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
            const order = req.body.data;

            if (order !== undefined && order !== null && typeof order.orderNumber === 'string') {
                const orderRepo = new ttts.repository.Order(mongoose.connection);
                const performanceRepo = new ttts.repository.Performance(mongoose.connection);
                const taskRepo = new ttts.repository.Task(mongoose.connection);
                const transactionRepo = new ttts.repository.Transaction(mongoose.connection);

                const taskAttribute: ttts.factory.task.createReturnOrderReport.IAttributes = {
                    name: <any>ttts.factory.taskName.CreateReturnOrderReport,
                    project: req.project,
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

                await ttts.service.performance.onOrderReturned({ orderNumber: order.orderNumber })({
                    order: orderRepo,
                    performance: performanceRepo,
                    transaction: transactionRepo
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
 */
webhooksRouter.post(
    '/onReservationConfirmed',
    async (req, res, next) => {
        try {
            const reservation =
                <ttts.factory.chevre.reservation.IReservation<ttts.factory.chevre.reservationType.EventReservation>>req.body.data;

            if (reservation !== undefined
                && reservation !== null
                && typeof reservation.id === 'string'
                && typeof reservation.reservationNumber === 'string') {
                const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
                const taskRepo = new ttts.repository.Task(mongoose.connection);

                // 余分確保分を除く
                let extraProperty: ttts.factory.propertyValue.IPropertyValue<string> | undefined;
                if (reservation.additionalProperty !== undefined) {
                    extraProperty = reservation.additionalProperty.find((p) => p.name === 'extra');
                }
                const isExtra = extraProperty !== undefined && extraProperty.value === '1';

                if (!isExtra) {
                    // 余分確保分でなければ予約データを作成する
                    const tttsResevation: ttts.factory.reservation.event.IReservation = {
                        ...reservation,
                        reservationFor: {
                            ...reservation.reservationFor,
                            doorTime: (reservation.reservationFor.doorTime !== undefined)
                                ? moment(reservation.reservationFor.doorTime)
                                    .toDate()
                                : undefined,
                            endDate: moment(reservation.reservationFor.endDate)
                                .toDate(),
                            startDate: moment(reservation.reservationFor.startDate)
                                .toDate()
                        },
                        checkins: []
                    };
                    await reservationRepo.saveEventReservation(tttsResevation);

                    // 集計タスク作成
                    const task: ttts.factory.task.aggregateEventReservations.IAttributes = {
                        name: <any>ttts.factory.taskName.AggregateEventReservations,
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
                    await taskRepo.save(<any>task);
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
 * 予約取消イベント
 */
webhooksRouter.post(
    '/onReservationCancelled',
    async (req, res, next) => {
        try {
            const reservation =
                <ttts.factory.chevre.reservation.IReservation<ttts.factory.chevre.reservationType.EventReservation>>req.body.data;

            if (reservation !== undefined
                && reservation !== null
                && typeof reservation.id === 'string'
                && typeof reservation.reservationNumber === 'string') {
                // 余分確保分を除く
                let extraProperty: ttts.factory.propertyValue.IPropertyValue<string> | undefined;
                if (reservation.additionalProperty !== undefined) {
                    extraProperty = reservation.additionalProperty.find((p) => p.name === 'extra');
                }
                const isExtra = extraProperty !== undefined && extraProperty.value === '1';

                if (!isExtra) {
                    await ttts.service.reserve.cancelReservation({ id: reservation.id })({
                        reservation: new ttts.repository.Reservation(mongoose.connection),
                        task: new ttts.repository.Task(mongoose.connection),
                        ticketTypeCategoryRateLimit: new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
                        project: new ttts.repository.Project(mongoose.connection)
                    });
                }
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default webhooksRouter;
