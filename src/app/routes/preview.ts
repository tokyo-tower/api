/**
 * previewルーター
 * @ignore
 */

import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
import * as moment from 'moment';

const previewRouter = Router();

const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(<string>process.env.REDIS_PORT, 10),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

// 集計データーつきのパフォーマンス検索
previewRouter.get('/performancesWithAggregation', async (req, res, next) => {
    try {
        const performanceWithAggregationRepo = new ttts.repository.EventWithAggregation(redisClient);
        let performancesWithAggregation = await performanceWithAggregationRepo.findAll();

        if (req.query.startFrom !== undefined) {
            const startFrom = moment(req.query.startFrom)
                .unix();
            performancesWithAggregation = performancesWithAggregation.filter(
                (p) => moment(p.startDate)
                    .unix() >= startFrom
            );
        }

        if (req.query.startThrough !== undefined) {
            const startThrough = moment(req.query.startThrough)
                .unix();
            performancesWithAggregation = performancesWithAggregation.filter(
                (p) => moment(p.startDate)
                    .unix() <= startThrough
            );
        }

        res.json(performancesWithAggregation);
    } catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable(error.message));
    }
});

// 入場場所検索
previewRouter.get('/places/checkinGate', async (__, res, next) => {
    try {
        const checkinGateRepo = new ttts.repository.place.CheckinGate(redisClient);
        const checkinGates = await checkinGateRepo.findAll();

        res.json(checkinGates);
    } catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable(error.message));
    }
});

export default previewRouter;
