/**
 * プロジェクト詳細ルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';

import aggregateSalesRouter from '../aggregateSales';
import eventsRouter from '../events';
import performanceRouter from '../performances';

const projectDetailRouter = express.Router();

projectDetailRouter.use((req, _, next) => {
    // プロジェクト未指定は拒否
    if (typeof req.project?.id !== 'string') {
        next(new ttts.factory.errors.Forbidden('project not specified'));

        return;
    }

    next();
});

projectDetailRouter.use('/aggregateSales', aggregateSalesRouter);
projectDetailRouter.use('/events', eventsRouter);
projectDetailRouter.use('/performances', performanceRouter);

export default projectDetailRouter;
