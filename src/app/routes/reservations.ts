/**
 * 予約ルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import { body, query } from 'express-validator';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

const project = {
    typeOf: <cinerinoapi.factory.chevre.organizationType.Project>cinerinoapi.factory.chevre.organizationType.Project,
    id: <string>process.env.PROJECT_ID
};

// const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
//     domain: <string>process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
//     clientId: <string>process.env.CINERINO_CLIENT_ID,
//     clientSecret: <string>process.env.CINERINO_CLIENT_SECRET,
//     scopes: [],
//     state: ''
// });

const reservationsRouter = express.Router();

reservationsRouter.use(authentication);
reservationsRouter.use(rateLimit);

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

            res.json(reservation);
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
            const noTotalCount = req.query.noTotalCount === '1';

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
                sort: (req.query.sort !== undefined) ? req.query.sort : { modifiedTime: ttts.factory.sortType.Descending }
            };

            // 予約を検索
            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);

            let count: number | undefined;
            if (!noTotalCount) {
                count = await reservationRepo.count(conditions);
            }

            const reservations = await reservationRepo.search(conditions);

            if (typeof count === 'number') {
                res.set('X-Total-Count', count.toString());
            }

            res.json(reservations);
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
    ...[
        body('when')
            .not()
            .isEmpty()
            .withMessage(() => 'required')
            .isISO8601()
    ],
    validator,
    async (req, res, next) => {
        try {
            let chevreUseActionId: string | undefined;

            // 注文トークンの指定があればcinerinoで予約使用
            const token = req.body.instrument?.token;
            if (typeof token === 'string' && token.length > 0) {
                const authClient = new cinerinoapi.auth.ClientCredentials({
                    domain: '',
                    clientId: '',
                    clientSecret: '',
                    scopes: [],
                    state: ''
                });
                authClient.setCredentials({ access_token: req.accessToken });

                const reservationService = new cinerinoapi.service.Reservation({
                    auth: authClient,
                    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                    project: { id: project.id }
                });
                const useResult = await reservationService.useByToken({
                    object: { id: req.params.id },
                    instrument: { token },
                    location: { identifier: req.body.where },
                    ...{
                        includesActionId: '1'
                    }
                });
                if (useResult !== undefined) {
                    chevreUseActionId = useResult.id;
                }
            }

            const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
            const taskRepo = new ttts.repository.Task(mongoose.connection);

            const checkin: ttts.factory.reservation.event.ICheckin = {
                when: moment(req.body.when)
                    .toDate(),
                where: req.body.where,
                why: req.body.why,
                how: req.body.how,
                // ChevreアクションIDを連携
                ...(typeof chevreUseActionId === 'string') ? { id: chevreUseActionId } : undefined
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
            // try {
            //     const reservationService = new cinerinoapi.service.Reservation({
            //         auth: cinerinoAuthClient,
            //         endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            //         project: { id: project.id }
            //     });
            //     await reservationService.attend({ id: reservation.id });
            // } catch (error) {
            //     // tslint:disable-next-line:no-console
            //     console.error('Cinerino reservationService.attend failed:', error);
            // }

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
            await cancelReservation({
                req: req,
                id: req.params.id
            })({
                reservation: new ttts.repository.Reservation(mongoose.connection),
                task: new ttts.repository.Task(mongoose.connection)
            });

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default reservationsRouter;

/**
 * 予約をキャンセルする
 */
export function cancelReservation(params: {
    req: express.Request;
    id: string;
}) {
    return async (repos: {
        reservation: ttts.repository.Reservation;
        task: ttts.repository.Task;
    }) => {
        const authClient = new cinerinoapi.auth.ClientCredentials({
            domain: '',
            clientId: '',
            clientSecret: '',
            scopes: [],
            state: ''
        });
        authClient.setCredentials({ access_token: params.req.accessToken });

        const reservationService = new cinerinoapi.service.Reservation({
            auth: authClient,
            endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });

        await reservationService.cancel({
            project: project,
            typeOf: ttts.factory.chevre.transactionType.CancelReservation,
            agent: {
                typeOf: cinerinoapi.factory.personType.Person,
                id: 'tokyotower',
                name: '@tokyotower/domain'
            },
            object: {
                reservation: { id: params.id }
            },
            expires: moment()
                // tslint:disable-next-line:no-magic-numbers
                .add(1, 'minutes')
                .toDate()
        });

        // 東京タワーDB側の予約もステータス変更
        await repos.reservation.cancel({ id: params.id });
    };
}
