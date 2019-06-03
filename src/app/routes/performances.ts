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
                // tslint:disable-next-line:no-magic-numbers
                limit: (!_.isEmpty(req.query.limit)) ? parseInt(req.query.limit, 10) : undefined,
                // tslint:disable-next-line:no-magic-numbers
                page: (!_.isEmpty(req.query.page)) ? parseInt(req.query.page, 10) : undefined,
                day: (!_.isEmpty(req.query.day)) ? req.query.day : undefined,
                startFrom: (!_.isEmpty(req.query.start_from)) ? moment(req.query.start_from)
                    .toDate() : undefined,
                startThrough: (!_.isEmpty(req.query.start_through)) ? moment(req.query.start_through)
                    .toDate() : undefined,
                performanceId: (!_.isEmpty(req.query.performanceId)) ? req.query.performanceId : undefined,
                wheelchair: (!_.isEmpty(req.query.screen)) ? req.query.wheelchair : undefined
            };

            const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);

            await ttts.service.performance.search(conditions)(
                performanceRepo,
                new ttts.repository.itemAvailability.Performance(redisClient),
                new ttts.repository.itemAvailability.SeatReservationOffer(redisClient),
                new ttts.repository.offer.ExhibitionEvent(redisClient)
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

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default performanceRouter;
