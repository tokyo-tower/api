/**
 * イベントルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import { query } from 'express-validator';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import rateLimit from '../middlewares/rateLimit';
import validator from '../middlewares/validator';

import { search } from '../service/performance';

const eventsRouter = express.Router();

eventsRouter.use(authentication);
eventsRouter.use(rateLimit);

/**
 * パフォーマンス検索
 */
eventsRouter.get(
    '',
    permitScopes(['transactions']),
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
    async (req, res, next) => {
        try {
            const countDocuments = req.query.countDocuments === '1';
            const useExtension = req.query.useExtension === '1';

            // 互換性維持
            if (req.query.day !== undefined) {
                if (typeof req.query.day === 'string' && req.query.day.length > 0) {
                    req.query.startFrom = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .toDate();
                    req.query.startThrough = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate();

                    delete req.query.day;
                }

                // if (typeof req.query.day === 'object') {
                //     // day: { '$gte': '20190603', '$lte': '20190802' } } の場合
                //     if (req.query.day.$gte !== undefined) {
                //         req.query.startFrom = moment(`${req.query.day.$gte}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                //             .toDate();
                //     }
                //     if (req.query.day.$lte !== undefined) {
                //         req.query.startThrough = moment(`${req.query.day.$lte}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                //             .add(1, 'day')
                //             .toDate();
                //     }

                //     delete req.query.day;
                // }
            }

            const conditions: ttts.factory.performance.ISearchConditions = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Number(req.query.limit) : 100,
                page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : 1,
                sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: 1 }
            };

            const performanceRepo = new ttts.repository.Performance(mongoose.connection);

            let totalCount: number | undefined;
            if (countDocuments) {
                totalCount = await performanceRepo.count(conditions);
            }

            const performances = await search(conditions, useExtension)({ performance: performanceRepo });

            if (typeof totalCount === 'number') {
                res.set('X-Total-Count', totalCount.toString());
            }

            res.json({ data: performances });
        } catch (error) {
            next(error);
        }
    }
);

export default eventsRouter;
