/**
 * パフォーマンスルーター
 * @module routes/performances
 */

import * as express from 'express';
import * as _ from 'underscore';

const performanceRouter = express.Router();

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';

import * as PerformanceController from '../controllers/performance';

const DEFAULT_RADIX = 10;

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
                limit: (!_.isEmpty(req.query.limit)) ? parseInt(req.query.limit, DEFAULT_RADIX) : undefined,
                page: (!_.isEmpty(req.query.page)) ? parseInt(req.query.page, DEFAULT_RADIX) : undefined,
                day: (!_.isEmpty(req.query.day)) ? req.query.day : undefined,
                section: (!_.isEmpty(req.query.section)) ? req.query.section : undefined,
                words: (!_.isEmpty(req.query.words)) ? req.query.words : undefined,
                startFrom: (!_.isEmpty(req.query.start_from)) ? parseInt(req.query.startFrom, DEFAULT_RADIX) : undefined,
                theater: (!_.isEmpty(req.query.theater)) ? req.query.theater : undefined,
                screen: (!_.isEmpty(req.query.screen)) ? req.query.screen : undefined,
                performanceId: (!_.isEmpty(req.query.performanceId)) ? req.query.performanceId : undefined,
                wheelchair: (!_.isEmpty(req.query.screen)) ? req.query.wheelchair : undefined
            };

            await PerformanceController.search(conditions).then((searchPerformanceResult) => {
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
