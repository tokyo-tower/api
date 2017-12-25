/**
 * パフォーマンスルーター
 * @module routes/performances
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as express from 'express';
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
 * パフォーマンス検索
 */
performanceRouter.get(
    '',
    permitScopes(['performances', 'performances.read-only']),
    async (req, res, next) => {
        try {
            const conditions = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (!_.isEmpty(req.query.limit)) ? parseInt(req.query.limit, 10) : undefined,
                // tslint:disable-next-line:no-magic-numbers
                page: (!_.isEmpty(req.query.page)) ? parseInt(req.query.page, 10) : undefined,
                day: (!_.isEmpty(req.query.day)) ? req.query.day : undefined,
                section: (!_.isEmpty(req.query.section)) ? req.query.section : undefined,
                words: (!_.isEmpty(req.query.words)) ? req.query.words : undefined,
                startFrom: (!_.isEmpty(req.query.start_from)) ? moment(req.query.start_from).toDate() : undefined,
                startThrough: (!_.isEmpty(req.query.start_through)) ? moment(req.query.start_through).toDate() : undefined,
                theater: (!_.isEmpty(req.query.theater)) ? req.query.theater : undefined,
                screen: (!_.isEmpty(req.query.screen)) ? req.query.screen : undefined,
                performanceId: (!_.isEmpty(req.query.performanceId)) ? req.query.performanceId : undefined,
                wheelchair: (!_.isEmpty(req.query.screen)) ? req.query.wheelchair : undefined
            };

            await ttts.service.performance.search(conditions)(
                new ttts.repository.Performance(ttts.mongoose.connection),
                new ttts.repository.itemAvailability.Performance(redisClient),
                new ttts.repository.itemAvailability.SeatReservationOffer(redisClient)
            ).then((searchPerformanceResult) => {
                res.json({
                    meta: {
                        number_of_performances: searchPerformanceResult.numberOfPerformances,
                        number_of_films: searchPerformanceResult.filmIds.length
                        // sales_suspended: searchPerformanceResult.salesSuspended
                    },
                    data: searchPerformanceResult.performances
                });
            });
        } catch (error) {
            next(error);
        }
    }
);

export default performanceRouter;
