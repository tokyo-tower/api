/**
 * 取引ルーター
 *
 * @module routes/transactions
 */

import * as express from 'express';
import * as httpStatus from 'http-status';

const transactionRouter = express.Router();

import * as TransactionController from '../controllers/transaction';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import setLocale from '../middlewares/setLocale';
import validator from '../middlewares/validator';

transactionRouter.use(authentication);

/**
 * 座席仮予約
 */
transactionRouter.post(
    '/authorizations',
    permitScopes(['transactions.authorizations']),
    setLocale,
    (req, __2, next) => {
        req.checkBody('performance').notEmpty().withMessage('performance is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            await TransactionController.createAuthorization(req.body.performance)
                .then((option) => {
                    option.match({
                        Some: (authorization) => {
                            res.status(httpStatus.OK).json({
                                data: authorization
                            });
                        },
                        None: () => {
                            // 空席がなければ404
                            res.status(httpStatus.NOT_FOUND).json({
                                data: null
                            });

                        }
                    });
                });
        } catch (error) {
            next(error);
        }
    }
);

transactionRouter.delete(
    '/authorizations/:id',
    permitScopes(['transactions.authorizations']),
    setLocale,
    (__1, __2, next) => {
        next();
    },
    validator,
    async (req, res, next) => {
        try {
            await TransactionController.deleteAuthorization(req.params.id);

            res.status(httpStatus.OK).json({
                data: {}
            });
        } catch (error) {
            next(error);
        }
    }
);

transactionRouter.post(
    '/confirm',
    permitScopes(['transactions']),
    setLocale,
    (__1, __2, next) => {
        next();
    },
    validator,
    async (__, res, next) => {
        try {
            await TransactionController.confirm();

            res.status(httpStatus.OK).json({
                data: {}
            });
        } catch (error) {
            next(error);
        }
    }
);

transactionRouter.post(
    '/cancel',
    permitScopes(['transactions']),
    setLocale,
    (__1, __2, next) => {
        next();
    },
    validator,
    async (__, res, next) => {
        try {
            await TransactionController.cancel();

            res.status(httpStatus.OK).json({
                data: {}
            });
        } catch (error) {
            next(error);
        }
    }
);

export default transactionRouter;
