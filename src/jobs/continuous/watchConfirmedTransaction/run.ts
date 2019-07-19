/**
 * 成立取引監視
 */
import * as ttts from '@tokyotower/domain';

import { connectMongo } from '../../../connectMongo';

export default async (_: {
    project?: ttts.factory.project.IProject;
}) => {
    const connection = await connectMongo({ defaultConnection: false });

    let countExecute = 0;

    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 200;
    const taskRepo = new ttts.repository.Task(connection);
    const transactionRepo = new ttts.repository.Transaction(connection);

    setInterval(
        async () => {
            if (countExecute > MAX_NUBMER_OF_PARALLEL_TASKS) {
                return;
            }

            countExecute += 1;

            try {
                await ttts.service.transaction.placeOrder.exportTasks(
                    ttts.factory.transactionStatusType.Confirmed
                )(taskRepo, transactionRepo);
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            countExecute -= 1;
        },
        INTERVAL_MILLISECONDS
    );
};
