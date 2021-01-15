/**
 * パフォーマンスルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';
import { NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

import permitScopes from '../middlewares/permitScopes';

const performanceRouter = express.Router();

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
                    ...(Array.isArray(req.body.checkedReservations))
                        ? { 'ttts_extension.checkedReservations': req.body.checkedReservations }
                        : undefined,
                    ...(req.body.reservationsAtLastUpdateDate !== undefined)
                        ? { 'ttts_extension.reservationsAtLastUpdateDate': req.body.reservationsAtLastUpdateDate }
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
                    ...(typeof req.body.eventStatus === 'string')
                        ? { eventStatus: req.body.eventStatus }
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

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

export default performanceRouter;
