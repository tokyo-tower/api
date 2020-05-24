/**
 * 予約ルーター
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
// tslint:disable-next-line:no-submodule-imports
import { query } from 'express-validator/check';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

import { tttsReservation2chevre } from '../util/reservation';

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: <string>process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.CHEVRE_CLIENT_ID,
    clientSecret: <string>process.env.CHEVRE_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const reservationsRouter = express.Router();

reservationsRouter.use(authentication);

/**
 * distinct検索
 */
reservationsRouter.get(
    '/distinct/:field',
    permitScopes(['admin']),
    ...[
        query('reservationFor.startFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('reservationFor.startThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('reservationFor.endFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('reservationFor.endThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('modifiedFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('modifiedThrough')
            .optional()
            .isISO8601()
            .toDate()
    ],
    validator,
    async (req, res, next) => {
        try {
            // 予約検索条件
            const conditions: ttts.factory.reservation.event.ISearchConditions = {
                ...req.query
                // tslint:disable-next-line:no-magic-numbers
                // limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                // page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
                // sort: (req.query.sort !== undefined) ? req.query.sort : undefined,
            };

            // 予約を検索
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const results = await reservationRepo.distinct(req.params.field, conditions);

            res.json(results);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 注文番号で予約検索
 */
reservationsRouter.get(
    '/findByOrderNumber/:orderNumber',
    permitScopes(['transactions', 'reservations.read-only']),
    ...[],
    validator,
    async (req, res, next) => {
        try {
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);

            // 予約検索条件
            const conditions: ttts.factory.reservation.event.ISearchConditions = {
                typeOf: ttts.factory.chevre.reservationType.EventReservation,
                underName: {
                    identifier: { $in: [{ name: 'orderNumber', value: req.params.orderNumber }] }
                }
            };

            // 予約を検索
            const reservations = await reservationRepo.search(conditions);

            // Chevreへチェックイン連携
            try {
                const reservationService = new cinerinoapi.service.Reservation({
                    auth: cinerinoAuthClient,
                    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                    project: { id: project.id }
                });
                await reservationService.checkIn({ reservationNumber: reservations[0].reservationNumber });
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error('Chevre checkInScreeningEventReservations failed:', error);
            }

            res.json(reservations.map(tttsReservation2chevre));
        } catch (error) {
            next(error);
        }
    }
);

/**
 * IDで予約取得(実質chevreチェックインapi)
 */
reservationsRouter.get(
    '/:id',
    permitScopes(['transactions', 'reservations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);

            // 予約を検索
            const reservation = await reservationRepo.findById({ id: req.params.id });

            // Chevreへチェックイン連携
            try {
                const reservationService = new cinerinoapi.service.Reservation({
                    auth: cinerinoAuthClient,
                    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                    project: { id: project.id }
                });
                await reservationService.checkIn({ id: reservation.id });
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error('Chevre checkInScreeningEventReservations failed:', error);
            }

            res.json(tttsReservation2chevre(reservation));
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 予約検索
 */
reservationsRouter.get(
    '',
    permitScopes(['reservations.read-only']),
    ...[
        query('reservationFor.startFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('reservationFor.startThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('reservationFor.endFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('reservationFor.endThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('modifiedFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('modifiedThrough')
            .optional()
            .isISO8601()
            .toDate()
    ],
    validator,
    async (req, res, next) => {
        try {
            // POSに対する互換性維持のため
            if (typeof req.query.performanceId === 'string' && req.query.performanceId !== '') {
                req.query.performance = req.query.performanceId;
            }

            // 予約検索条件
            const conditions: ttts.factory.reservation.event.ISearchConditions = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
                sort: (req.query.sort !== undefined) ? req.query.sort : undefined,
                // デフォルトで余分確保分を除く
                additionalProperty: {
                    $nin: [{ name: 'extra', value: '1' }]
                }
            };

            // 予約を検索
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const count = await reservationRepo.count(conditions);
            const reservations = await reservationRepo.search(conditions);

            res.set('X-Total-Count', count.toString())
                .json(reservations.map(tttsReservation2chevre));
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 入場
 */
reservationsRouter.post(
    '/:id/checkins',
    permitScopes(['reservations.checkins']),
    (req, __, next) => {
        req.checkBody('when', 'invalid when')
            .notEmpty()
            .withMessage('when is required')
            .isISO8601();

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);

            const checkin: ttts.factory.reservation.event.ICheckin = {
                when: moment(req.body.when)
                    .toDate(),
                where: req.body.where,
                why: req.body.why,
                how: req.body.how
            };
            const reservation = await reservationRepo.checkIn({
                id: req.params.id,
                checkin: checkin
            });

            // レポート更新タスク作成
            const taskAttributes: ttts.factory.task.updateOrderReportByReservation.IAttributes = {
                name: <any>ttts.factory.taskName.UpdateOrderReportByReservation,
                project: req.project,
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                numberOfTried: 0,
                executionResults: [],
                data: { reservation: reservation }
            };
            await taskRepo.save(<any>taskAttributes);

            // 集計タスク作成
            const aggregateTask: ttts.factory.task.aggregateEventReservations.IAttributes = {
                name: <any>ttts.factory.taskName.AggregateEventReservations,
                project: req.project,
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                numberOfTried: 0,
                executionResults: [],
                data: { id: reservation.reservationFor.id }
            };
            await taskRepo.save(<any>aggregateTask);

            // Chevreへ入場連携
            try {
                const reservationService = new cinerinoapi.service.Reservation({
                    auth: cinerinoAuthClient,
                    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                    project: { id: project.id }
                });
                await reservationService.attend({ id: reservation.id });
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error('Cinerino reservationService.attend failed:', error);
            }

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 入場取消
 * 入場日時がid
 */
reservationsRouter.delete(
    '/:id/checkins/:when',
    permitScopes(['reservations.checkins']),
    validator,
    async (req, res, next) => {
        try {
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);

            const checkin: ttts.factory.reservation.event.ICheckin = {
                when: req.params.when,
                where: '',
                why: '',
                how: ''
            };
            const reservation = await reservationRepo.cancelCheckIn({
                id: req.params.id,
                checkin: checkin
            });

            // レポート更新タスク作成
            const taskAttributes: ttts.factory.task.updateOrderReportByReservation.IAttributes = {
                name: <any>ttts.factory.taskName.UpdateOrderReportByReservation,
                project: req.project,
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                numberOfTried: 0,
                executionResults: [],
                data: { reservation: reservation }
            };
            await taskRepo.save(<any>taskAttributes);

            // 集計タスク作成
            const aggregateTask: ttts.factory.task.aggregateEventReservations.IAttributes = {
                name: <any>ttts.factory.taskName.AggregateEventReservations,
                project: req.project,
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                numberOfTried: 0,
                executionResults: [],
                data: { id: reservation.reservationFor.id }
            };
            await taskRepo.save(<any>aggregateTask);

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 予約キャンセル
 */
reservationsRouter.put(
    '/:id/cancel',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            await ttts.service.reserve.cancelReservation({ id: req.params.id })({
                reservation: new ttts.repository.Reservation(mongoose.connection),
                task: new ttts.repository.Task(mongoose.connection),
                // ticketTypeCategoryRateLimit: new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
                project: new ttts.repository.Project(mongoose.connection)
            });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default reservationsRouter;
