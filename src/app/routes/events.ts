/**
 * イベントルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import { query } from 'express-validator';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const eventsRouter = express.Router();

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
            // const useExtension = req.query.useExtension === '1';

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

            // const performances = await search(conditions, useExtension, false)({ performance: performanceRepo });

            const projection: any = {
                __v: 0,
                created_at: 0,
                updated_at: 0,
                location: 0,
                superEvent: 0,
                offers: 0,
                doorTime: 0,
                duration: 0,
                maximumAttendeeCapacity: 0,
                remainingAttendeeCapacity: 0,
                remainingAttendeeCapacityForWheelchair: 0,
                reservationCount: 0,
                reservationCountsByTicketType: 0,
                aggregateEntranceGate: 0,
                aggregateOffer: 0,
                aggregateReservation: 0,
                checkinCount: 0,
                checkinCountsByWhere: 0
            };

            const performances = await performanceRepo.search(conditions, projection);

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
