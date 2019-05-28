/**
 * 予約ルーター
 * @namespace routes.reservations
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import * as express from 'express';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as _ from 'underscore';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const debug = createDebug('ttts-api:routes:reservations');
const reservationsRouter = express.Router();

reservationsRouter.use(authentication);

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
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
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
    validator,
    async (req, res, next) => {
        try {
            // 予約検索条件
            const conditions = {
                status: (!_.isEmpty(req.query.status)) ? req.query.status : undefined,
                performanceId: (!_.isEmpty(req.query.performanceId)) ? req.query.performanceId : undefined,
                performanceStartFrom: (!_.isEmpty(req.query.performanceStartFrom))
                    ? moment(req.query.performanceStartFrom)
                        .toDate()
                    : undefined,
                performanceStartThrough: (!_.isEmpty(req.query.performanceStartThrough))
                    ? moment(req.query.performanceStartThrough)
                        .toDate()
                    : undefined,
                performanceEndFrom: (!_.isEmpty(req.query.performanceEndFrom))
                    ? moment(req.query.performanceEndFrom)
                        .toDate()
                    : undefined,
                performanceEndThrough: (!_.isEmpty(req.query.performanceEndThrough))
                    ? moment(req.query.performanceEndThrough)
                        .toDate()
                    : undefined
            };

            // 予約を検索
            debug('searching reservations...', conditions);
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const reservations = await reservationRepo.search(conditions);

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
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

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
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

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

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default reservationsRouter;
