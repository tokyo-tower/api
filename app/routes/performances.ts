/**
 * パフォーマンスルーター
 *
 * @module routes/performances
 */

import * as express from 'express';

const performanceRouter = express.Router();

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import setLocale from '../middlewares/setLocale';

import * as PerformanceController from '../controllers/performance';

performanceRouter.use(authentication);

/**
 * パフォーマンス検索
 */
performanceRouter.get(
    '',
    permitScopes(['performances', 'performances.read-only']),
    setLocale,
    PerformanceController.search
);

export default performanceRouter;
