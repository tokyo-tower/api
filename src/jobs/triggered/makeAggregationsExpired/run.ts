/**
 * 不要なイベント予約集計を削除する
 */
import * as ttts from '@tokyotower/domain';
import { CronJob } from 'cron';
import * as createDebug from 'debug';
import * as moment from 'moment';

import { connectMongo } from '../../../connectMongo';
import * as singletonProcess from '../../../singletonProcess';

const debug = createDebug('ttts-api:jobs');

export default async (params: {
    project?: ttts.factory.project.IProject;
}) => {
    let holdSingletonProcess = false;
    setInterval(
        async () => {
            holdSingletonProcess = await singletonProcess.lock({
                project: params.project,
                key: 'makeAggregationsExpired',
                ttl: 60
            });
        },
        // tslint:disable-next-line:no-magic-numbers
        10000
    );

    const connection = await connectMongo({ defaultConnection: false });

    const redisClient = ttts.redis.createClient({
        port: Number(<string>process.env.REDIS_PORT),
        host: <string>process.env.REDIS_HOST,
        password: process.env.REDIS_KEY,
        tls: { servername: process.env.REDIS_HOST }
    });

    const job = new CronJob(
        '0 * * * *',
        async () => {
            if (!holdSingletonProcess) {
                return;
            }

            const performanceRepo = new ttts.repository.Performance(connection);
            const eventWithAggregationRepo = new ttts.repository.EventWithAggregation(redisClient);

            // 過去のイベントを検索
            const startThrough = moment()
                .add(-1, 'week')
                .toDate();
            const startFrom = moment(startThrough)
                .add(-1, 'week')
                .toDate();
            const eventIds = await performanceRepo.distinct('_id', {
                startFrom: startFrom,
                startThrough: startThrough
            });

            if (eventIds.length > 0) {
                await eventWithAggregationRepo.deleteByIds({ ids: eventIds });
            }
        },
        undefined,
        true
    );
    debug('job started', job);
};
