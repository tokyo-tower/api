/**
 * パフォーマンスルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

import { searchByChevre } from '../service/performance';

const performanceRouter = express.Router();

performanceRouter.use(authentication);
performanceRouter.use(rateLimit);

/**
 * IDでパフォーマンス検索
 */
performanceRouter.get(
    '/:id',
    permitScopes(['transactions', 'pos']),
    async (req, res, next) => {
        try {
            const repo = new ttts.repository.Performance(mongoose.connection);
            const performance = await repo.findById(req.params.id);

            res.json(performance);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * パフォーマンス検索
 */
performanceRouter.get(
    '',
    permitScopes(['transactions', 'pos']),
    ...[],
    validator,
    async (req, res, next) => {
        try {
            const events = await searchByChevre(req.query)();

            res.json({ data: events });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 拡張属性更新
 */
performanceRouter.put(
    '/:id/extension',
    permitScopes(['admin']),
    // tslint:disable-next-line:cyclomatic-complexity
    async (req, res, next) => {
        try {
            let newEventStatus = ttts.factory.chevre.eventStatusType.EventScheduled;
            switch (req.body.evServiceStatus) {
                case ttts.factory.performance.EvServiceStatus.Slowdown:
                    newEventStatus = ttts.factory.chevre.eventStatusType.EventPostponed;
                    break;

                case ttts.factory.performance.EvServiceStatus.Suspended:
                    newEventStatus = ttts.factory.chevre.eventStatusType.EventCancelled;
                    break;

                default:
            }

            const performanceRepo = new ttts.repository.Performance(mongoose.connection);
            await performanceRepo.updateOne(
                { _id: req.params.id },
                {
                    ...(req.body.reservationsAtLastUpdateDate !== undefined)
                        ? { 'ttts_extension.reservationsAtLastUpdateDate': req.body.reservationsAtLastUpdateDate }
                        : undefined,
                    ...(req.body.onlineSalesStatus !== undefined)
                        ? {
                            'ttts_extension.online_sales_status': req.body.onlineSalesStatus
                        }
                        : undefined,
                    ...(req.body.onlineSalesStatusUpdateUser !== undefined)
                        ? { 'ttts_extension.online_sales_update_user': req.body.onlineSalesStatusUpdateUser }
                        : undefined,
                    ...(req.body.onlineSalesStatusUpdateAt !== undefined && req.body.onlineSalesStatusUpdateAt !== '')
                        ? {
                            'ttts_extension.online_sales_update_at': moment(req.body.onlineSalesStatusUpdateAt)
                                .toDate()
                        }
                        : undefined,
                    ...(req.body.evServiceStatus !== undefined)
                        ? {
                            'ttts_extension.ev_service_status': req.body.evServiceStatus,
                            eventStatus: newEventStatus
                        }
                        : undefined,
                    ...(typeof req.body.eventStatus === 'string')
                        ? {
                            eventStatus: req.body.eventStatus
                        }
                        : undefined,
                    ...(req.body.evServiceStatusUpdateUser !== undefined)
                        ? { 'ttts_extension.ev_service_update_user': req.body.evServiceStatusUpdateUser }
                        : undefined,
                    ...(req.body.evServiceStatusUpdateAt !== undefined && req.body.evServiceStatusUpdateAt !== '')
                        ? {
                            'ttts_extension.ev_service_update_at': moment(req.body.evServiceStatusUpdateAt)
                                .toDate()
                        }
                        : undefined,

                    ...(typeof req.body.refundCount === 'number' || typeof req.body.refundCount === 'string')
                        ? { 'ttts_extension.refunded_count': Number(req.body.refundCount) }
                        : undefined,
                    ...(typeof req.body.unrefundCount === 'number' || typeof req.body.unrefundCount === 'string')
                        ? { 'ttts_extension.unrefunded_count': Number(req.body.unrefundCount) }
                        : undefined,
                    ...(req.body.refundStatus !== undefined)
                        ? { 'ttts_extension.refund_status': req.body.refundStatus }
                        : undefined,
                    ...(req.body.refundStatusUpdateUser !== undefined)
                        ? { 'ttts_extension.refund_update_user': req.body.refundStatusUpdateUser }
                        : undefined,
                    ...(req.body.refundStatusUpdateAt !== undefined && req.body.refundStatusUpdateAt !== '')
                        ? {
                            'ttts_extension.refund_update_at': moment(req.body.refundStatusUpdateAt)
                                .toDate()
                        }
                        : undefined
                }
            );

            // 集計タスク作成
            const taskRepo = new ttts.repository.Task(mongoose.connection);
            const aggregateTask: ttts.factory.task.aggregateEventReservations.IAttributes = {
                name: <any>ttts.factory.taskName.AggregateEventReservations,
                project: req.project,
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                numberOfTried: 0,
                executionResults: [],
                data: { id: req.params.id }
            };
            await taskRepo.save(<any>aggregateTask);

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default performanceRouter;
