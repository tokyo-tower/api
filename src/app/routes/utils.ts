/**
 * utilsルーター
 * @ignore
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { Router } from 'express';

import * as PerformanceController from '../controllers/performances';

const utilsRouter = Router();
const debug = createDebug('ttts-api:routes:utils');

// api・予約通過確認
utilsRouter.get('/performancesWithCountAggregation', async (req, res, next) => {
    try {
        // 取得対象のパフォーマンス取得
        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const ownerRepo = new ttts.repository.Owner(ttts.mongoose.connection);

        const performances = await performanceRepo.performanceModel.find(
            {
                day: req.query.day
            }
        )
            .populate('film screen theater')
            .populate({ path: 'ticket_type_group', populate: { path: 'ticket_types' } })
            .exec().then((docs) => docs.map((doc) => <ttts.factory.performance.IPerformanceWithDetails>doc.toObject()));
        debug('performances found,', performances.length);

        // 予約情報取得
        const reservations = await reservationRepo.reservationModel.find(
            {
                performance: { $in: performances.map((p) => p.id) },
                status: ttts.factory.reservationStatusType.ReservationConfirmed
            }
        ).exec().then((docs) => docs.map((doc) => <ttts.factory.reservation.event.IReservation>doc.toObject()));
        debug('reservations found,', reservations.length);

        // チェックポイント名称取得
        const owners = await ownerRepo.ownerModel.find({ notes: '1' }).exec();

        const checkpoints: PerformanceController.ICheckpoint[] = owners.map((owner) => {
            return {
                where: owner.get('group'),
                description: owner.get('description')
            };
        });

        const aggregations: PerformanceController.ICountAggregationByPerformance[] = [];

        // パフォーマンスごとに集計
        performances.forEach(async (performance) => {
            const reservations4performance = reservations.filter((r) => r.performance === performance.id);
            debug('creating schedule...');

            const aggregation = PerformanceController.aggregateCounts(performance, reservations4performance, checkpoints)();

            aggregations.push(aggregation);
        });

        res.json(aggregations);
    } catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable('予約通過確認情報取得失敗'));
    }
});

export default utilsRouter;
