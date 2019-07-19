/**
 * 取引タスクエクスポートが実行中のままになっている取引を監視する
 */
import * as ttts from '@tokyotower/domain';
import * as createDebug from 'debug';

import { connectMongo } from '../../../connectMongo';

const debug = createDebug('ttts-api');

export default async (_: {
    project?: ttts.factory.project.IProject;
}) => {
    const connection = await connectMongo({ defaultConnection: false });

    let countRetry = 0;

    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 500;
    const transactionRepo = new ttts.repository.Transaction(connection);
    const RETRY_INTERVAL_MINUTES = 10;

    setInterval(
        async () => {
            if (countRetry > MAX_NUBMER_OF_PARALLEL_TASKS) {
                return;
            }

            countRetry += 1;

            try {
                debug('reexporting tasks...');
                await transactionRepo.reexportTasks(RETRY_INTERVAL_MINUTES);
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            countRetry -= 1;
        },
        INTERVAL_MILLISECONDS
    );
};
