/**
 * タスク中止
 */
import * as ttts from '@tokyotower/domain';

import { connectMongo } from '../../../connectMongo';

export default async (_: {
    project?: ttts.factory.project.IProject;
}) => {
    const connection = await connectMongo({ defaultConnection: false });

    let count = 0;

    const MAX_NUBMER_OF_PARALLEL_TASKS = 10;
    const INTERVAL_MILLISECONDS = 500;
    const RETRY_INTERVAL_MINUTES = 10;
    const taskRepo = new ttts.repository.Task(connection);

    setInterval(
        async () => {
            if (count > MAX_NUBMER_OF_PARALLEL_TASKS) {
                return;
            }

            count += 1;

            try {
                await ttts.service.task.abort(RETRY_INTERVAL_MINUTES)(taskRepo);
            } catch (error) {
                // tslint:disable-next-line:no-console
                console.error(error);
            }

            count -= 1;
        },
        INTERVAL_MILLISECONDS
    );
};
