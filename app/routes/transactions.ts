/**
 * 取引ルーター
 *
 * @module routes/transactions
 */

import * as express from 'express';

const transactionRouter = express.Router();

import authentication from '../middlewares/authentication';

transactionRouter.use(authentication);

export default transactionRouter;
