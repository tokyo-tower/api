/**
 * デフォルトルーター
 *
 * @module routes/router
 */

import * as express from 'express';

const router = express.Router();

import authentication from '../middlewares/authentication';

router.use(authentication);

export default router;
