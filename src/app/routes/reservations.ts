/**
 * 予約ルーター
 */
import * as ttts from '@tokyotower/domain';
import * as createDebug from 'debug';
import * as express from 'express';
// tslint:disable-next-line:no-submodule-imports
import { query } from 'express-validator/check';
import { CREATED, NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as _ from 'underscore';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

import { tttsReservation2chevre } from '../util/reservation';

const debug = createDebug('ttts-api:routes:reservations');

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

const chevreAuthClient = new ttts.chevre.auth.ClientCredentials({
    domain: <string>process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.CHEVRE_CLIENT_ID,
    clientSecret: <string>process.env.CHEVRE_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const reservationsRouter = express.Router();

reservationsRouter.use(authentication);

/**
 * 印刷トークン発行
 */
reservationsRouter.post(
    '/print/token',
    permitScopes(['admin']),
    validator,
    async (req, res, next) => {
        try {
            const tokenRepo = new ttts.repository.Token(redisClient);
            const token = await tokenRepo.createPrintToken(req.body.ids);
            debug('printToken created.');

            res.status(CREATED)
                .json({ token });
        } catch (error) {
            next(error);
        }
    }
);

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
            debug('searching reservations...', conditions);
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const results = await reservationRepo.distinct(req.params.field, conditions);

            res.json(results);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * IDで予約取得
 */
reservationsRouter.get(
    '/:id',
    permitScopes(['reservations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            // 予約を検索
            debug('searching reservation by id...', req.params.id);
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const reservation = await reservationRepo.findById({ id: req.params.id });

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
            // 互換性維持のためｎ
            if (!_.isEmpty(req.query.performanceId)) {
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
            debug('searching reservations...', conditions);
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
            const projectRepo = new ttts.repository.Project(mongoose.connection);
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);

            const project = await projectRepo.findById({ id: req.project.id });
            if (project.settings === undefined) {
                throw new ttts.factory.errors.ServiceUnavailable('Project settings undefined');
            }
            if (project.settings.chevre === undefined) {
                throw new ttts.factory.errors.ServiceUnavailable('Project settings not found');
            }

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
            const taskAttributes = ttts.factory.task.updateOrderReportByReservation.createAttributes({
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                // tslint:disable-next-line:no-null-keyword
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { reservation: reservation }
            });
            await taskRepo.save(taskAttributes);

            // 集計タスク作成
            const aggregateTask: ttts.factory.task.aggregateEventReservations.IAttributes = {
                name: ttts.factory.taskName.AggregateEventReservations,
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                // tslint:disable-next-line:no-null-keyword
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { id: reservation.reservationFor.id }
            };
            await taskRepo.save(aggregateTask);

            // Chevreへ入場連携
            const reservationService = new ttts.chevre.service.Reservation({
                endpoint: project.settings.chevre.endpoint,
                auth: chevreAuthClient
            });
            await reservationService.attendScreeningEvent(reservation);

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
            const taskAttributes = ttts.factory.task.updateOrderReportByReservation.createAttributes({
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                // tslint:disable-next-line:no-null-keyword
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { reservation: reservation }
            });
            await taskRepo.save(taskAttributes);

            // 集計タスク作成
            const aggregateTask: ttts.factory.task.aggregateEventReservations.IAttributes = {
                name: ttts.factory.taskName.AggregateEventReservations,
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                // tslint:disable-next-line:no-null-keyword
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { id: reservation.reservationFor.id }
            };
            await taskRepo.save(aggregateTask);

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
                ticketTypeCategoryRateLimit: new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
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
