/**
 * パフォーマンスルーター
 */
import * as ttts from '@motionpicture/ttts-domain';
import * as express from 'express';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as _ from 'underscore';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';

const performanceRouter = express.Router();

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

performanceRouter.use(authentication);

/**
 * IDでパフォーマンス検索
 */
performanceRouter.get(
    '/:id',
    permitScopes(['performances', 'performances.read-only']),
    async (req, res, next) => {
        try {
            const repo = new ttts.repository.Performance(ttts.mongoose.connection);
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
    permitScopes(['performances', 'performances.read-only']),
    async (req, res, next) => {
        try {
            const conditions: ttts.factory.performance.ISearchConditions = {
                ...req.query,
                limit: (!_.isEmpty(req.query.limit)) ? Number(req.query.limit) : undefined,
                page: (!_.isEmpty(req.query.page)) ? Number(req.query.page) : undefined,
                startFrom: (!_.isEmpty(req.query.start_from)) ? moment(req.query.start_from)
                    .toDate() : undefined,
                startThrough: (!_.isEmpty(req.query.start_through)) ? moment(req.query.start_through)
                    .toDate() : undefined,
                ttts_extension: {
                    ...req.query.ttts_extension,
                    online_sales_update_at:
                        (req.query.ttts_extension !== undefined && req.query.ttts_extension.online_sales_update_at !== undefined)
                            ? {
                                $gte: moment(req.query.ttts_extension.online_sales_update_at.$gte)
                                    .toDate(),
                                $lt: moment(req.query.ttts_extension.online_sales_update_at.$lt)
                                    .toDate()
                            }
                            : undefined
                }
            };

            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);

            await ttts.service.performance.search(conditions)(
                performanceRepo,
                new ttts.repository.EventWithAggregation(redisClient)
            )
                .then((searchPerformanceResult) => {
                    res.set('X-Total-Count', searchPerformanceResult.numberOfPerformances.toString())
                        .json({
                            meta: {
                                number_of_performances: searchPerformanceResult.numberOfPerformances,
                                number_of_films: searchPerformanceResult.filmIds.length
                            },
                            data: searchPerformanceResult.performances
                        });
                });
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
            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
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
            const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);
            const aggregateTask: ttts.factory.task.aggregateEventReservations.IAttributes = {
                name: ttts.factory.taskName.AggregateEventReservations,
                status: ttts.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 3,
                // tslint:disable-next-line:no-null-keyword
                lastTriedAt: null,
                numberOfTried: 0,
                executionResults: [],
                data: { id: req.params.id }
            };
            await taskRepo.save(aggregateTask);

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default performanceRouter;
