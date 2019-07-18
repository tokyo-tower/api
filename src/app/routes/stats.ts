/**
 * 統計ルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';

const statsRouter = express.Router();

import { OK } from 'http-status';

statsRouter.get(
    '/dbStats',
    async (_, res, next) => {
        try {
            const stats = await ttts.mongoose.connection.db.stats();

            res.status(OK)
                .json(stats);
        } catch (error) {
            next(error);
        }
    });

export default statsRouter;
