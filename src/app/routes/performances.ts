/**
 * パフォーマンスルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import { query } from 'express-validator';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

import { search, searchByChevre } from '../service/performance';

const USE_NEW_EVENT_SEARCH = process.env.USE_NEW_EVENT_SEARCH === '1';

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
    });

/**
 * パフォーマンス検索
 */
performanceRouter.get(
    '',
    permitScopes(['transactions', 'pos']),
    ...[
        query('startFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('startThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('endFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('endThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('ttts_extension.online_sales_update_at.$gte')
            .optional()
            .isISO8601()
            .toDate(),
        query('ttts_extension.online_sales_update_at.$lt')
            .optional()
            .isISO8601()
            .toDate()
    ],
    validator,
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            const countDocuments = req.query.countDocuments === '1';
            let useLegacySearch = req.query.useLegacySearch === '1';

            if (!USE_NEW_EVENT_SEARCH) {
                useLegacySearch = true;
            }

            if (useLegacySearch) {
                // POSへの互換性維持
                if (req.query.day !== undefined) {
                    if (typeof req.query.day === 'string' && req.query.day.length > 0) {
                        req.query.startFrom = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .toDate();
                        req.query.startThrough = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .add(1, 'day')
                            .toDate();

                        delete req.query.day;
                    }

                    if (typeof req.query.day === 'object') {
                        // day: { '$gte': '20190603', '$lte': '20190802' } } の場合
                        if (req.query.day.$gte !== undefined) {
                            req.query.startFrom = moment(`${req.query.day.$gte}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                                .toDate();
                        }
                        if (req.query.day.$lte !== undefined) {
                            req.query.startThrough = moment(`${req.query.day.$lte}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                                .add(1, 'day')
                                .toDate();
                        }

                        delete req.query.day;
                    }
                }

                const conditions: ttts.factory.performance.ISearchConditions = {
                    ...req.query,
                    // tslint:disable-next-line:no-magic-numbers
                    limit: (req.query.limit !== undefined) ? Number(req.query.limit) : 100,
                    page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : 1,
                    sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: 1 },
                    // POSへの互換性維持のためperformanceIdを補完
                    ids: (typeof req.query.performanceId === 'string') ? [String(req.query.performanceId)] : undefined
                };

                const performanceRepo = new ttts.repository.Performance(mongoose.connection);

                let totalCount: number | undefined;
                if (countDocuments) {
                    totalCount = await performanceRepo.count(conditions);
                }

                const performances = await search(conditions)({ performance: performanceRepo });

                if (typeof totalCount === 'number') {
                    res.set('X-Total-Count', totalCount.toString());
                }

                res.json({ data: performances });
            } else {
                const events = await searchByChevre(req.query)();

                res.json({ data: events });
            }
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
    async (req, res, next) => {
        try {
            const performanceRepo = new ttts.repository.Performance(mongoose.connection);
            await performanceRepo.updateOne(
                { _id: req.params.id },
                {
                    ...(req.body.reservationsAtLastUpdateDate !== undefined)
                        ? { 'ttts_extension.reservationsAtLastUpdateDate': req.body.reservationsAtLastUpdateDate }
                        : undefined,
                    ...(req.body.onlineSalesStatus !== undefined)
                        ? { 'ttts_extension.online_sales_status': req.body.onlineSalesStatus }
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
                        ? { 'ttts_extension.ev_service_status': req.body.evServiceStatus }
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
