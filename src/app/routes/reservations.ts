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
            const reservation = await reservationRepo.reservationModel.findById(req.params.id)
                .exec().then((doc) => {
                    if (doc === null) {
                        throw new ttts.factory.errors.NotFound('Reservation');
                    }

                    return <ttts.factory.reservation.event.IReservation>doc.toObject();
                });

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
            const conditions: any[] = [];

            if (!_.isEmpty(req.query.status)) {
                conditions.push({ status: req.query.status });
            }
            if (!_.isEmpty(req.query.performanceId)) {
                conditions.push({ performance: req.query.performanceId });
            }
            if (!_.isEmpty(req.query.performanceStartFrom)) {
                conditions.push({ performance_start_date: { $gte: moment(req.query.performanceStartFrom).toDate() } });
            }
            if (!_.isEmpty(req.query.performanceStartThrough)) {
                conditions.push({ performance_start_date: { $lte: moment(req.query.performanceStartThrough).toDate() } });
            }
            if (!_.isEmpty(req.query.performanceEndFrom)) {
                conditions.push({ performance_end_date: { $gte: moment(req.query.performanceEndFrom).toDate() } });
            }
            if (!_.isEmpty(req.query.performanceEndThrough)) {
                conditions.push({ performance_end_date: { $lte: moment(req.query.performanceEndThrough).toDate() } });
            }

            // 予約を検索
            debug('searching reservations...', conditions);
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const reservations = await reservationRepo.reservationModel.find({ $and: conditions })
                .exec().then((docs) => docs.map((doc) => <ttts.factory.reservation.event.IReservation>doc.toObject()));

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
        req.checkBody('when', 'invalid when').notEmpty().withMessage('when is required').isISO8601();

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
            const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);

            const checkin: ttts.factory.reservation.event.ICheckin = {
                when: moment(req.body.when).toDate(),
                where: req.body.where,
                why: req.body.why,
                how: req.body.how
            };
            const doc = await reservationRepo.reservationModel.findByIdAndUpdate(
                req.params.id,
                { $push: { checkins: checkin } },
                { new: true }
            ).exec();
            if (doc === null) {
                throw new ttts.factory.errors.NotFound('Reservation');
            }

            // レポート更新タスク作成
            const taskAttributes = ttts.factory.task.updateOrderReportByReservation.createAttributes({
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { reservation: doc.toObject() }
            });
            await taskRepo.save(taskAttributes);

            res.status(NO_CONTENT).end();
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

            const doc = await reservationRepo.reservationModel.findByIdAndUpdate(
                req.params.id,
                { $pull: { checkins: { when: req.params.when } } },
                { new: true }
            ).exec();
            if (doc === null) {
                throw new ttts.factory.errors.NotFound('Reservation');
            }

            // レポート更新タスク作成
            const taskAttributes = ttts.factory.task.updateOrderReportByReservation.createAttributes({
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { reservation: doc.toObject() }
            });
            await taskRepo.save(taskAttributes);

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

export default reservationsRouter;
