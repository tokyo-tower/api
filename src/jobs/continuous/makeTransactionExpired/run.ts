/**
 * 取引期限監視
 */
import * as ttts from '@tokyotower/domain';
import * as createDebug from 'debug';

import { connectMongo } from '../../../connectMongo';

const debug = createDebug('ttts-api');

export default async (_: {
    project?: ttts.factory.project.IProject;
}) => {
    const connection = await connectMongo({ defaultConnection: false });

    let count = 0;

    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 1000;
    const transactionRepo = new ttts.repository.Transaction(connection);

    setInterval(
        async () => {
            if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
                return;
            }

            count += 1;

            try {
                debug('transaction expiring...');
                await transactionRepo.makeExpired({});
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            count -= 1;
        },
        INTERVAL_MILLISECONDS
    );
};
