/**
 * 取引ルーター
 *
 * @module routes/transactions
 */

import * as express from 'express';

const transactionRouter = express.Router();

import * as TransactionController from '../controllers/transaction';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import setLocale from '../middlewares/setLocale';
import validator from '../middlewares/validator';

transactionRouter.use(authentication);

transactionRouter.post(
    '/authorizations',
    permitScopes(['transactions.authorizations']),
    setLocale,
    (__1, __2, next) => {
        next();
    },
    validator,
    TransactionController.createAuthorization
);

transactionRouter.delete(
    '/authorizations/:id',
    permitScopes(['transactions.authorizations']),
    setLocale,
    (__1, __2, next) => {
        next();
    },
    validator,
    TransactionController.deleteAuthorization
);

transactionRouter.post(
    '/confirm',
    permitScopes(['transactions']),
    setLocale,
    (__1, __2, next) => {
        next();
    },
    validator,
    TransactionController.confirm
);

transactionRouter.post(
    '/cancel',
    permitScopes(['transactions']),
    setLocale,
    (__1, __2, next) => {
        next();
    },
    validator,
    TransactionController.cancel
);

export default transactionRouter;
