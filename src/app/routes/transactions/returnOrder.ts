/**
 * 注文取引ルーター
 */
import * as ttts from '@tokyotower/domain';
import * as createDebug from 'debug';
import { Router } from 'express';
// tslint:disable-next-line:no-submodule-imports
import { query } from 'express-validator/check';
import { CREATED } from 'http-status';
import * as mongoose from 'mongoose';

const returnOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

const debug = createDebug('ttts-api:returnOrderTransactionsRouter');

returnOrderTransactionsRouter.use(authentication);

/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post(
    '/confirm',
    permitScopes(['transactions']),
    (req, __, next) => {
        req.checkBody('performance_day', 'invalid performance_day')
            .notEmpty()
            .withMessage('performance_day is required');
        req.checkBody('payment_no', 'invalid payment_no')
            .notEmpty()
            .withMessage('payment_no is required');
        req.checkBody('cancellation_fee', 'invalid cancellation_fee')
            .notEmpty()
            .withMessage('cancellation_fee is required')
            .isInt();
        req.checkBody('forcibly', 'invalid forcibly')
            .notEmpty()
            .withMessage('forcibly is required')
            .isBoolean();

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const invoiceRepo = new ttts.repository.Invoice(mongoose.connection);
            const transactionRepo = new ttts.repository.Transaction(mongoose.connection);

            // 取引を検索する
            // 注文番号フォーマット: `TT-${req.body.performance_day.slice(-6)}-${req.body.payment_no}`
            const conditions = {
                typeOf: ttts.factory.transactionType.PlaceOrder,
                'result.order.orderNumber': {
                    $exists: true,
                    // tslint:disable-next-line:no-magic-numbers
                    $eq: `TT-${req.body.performance_day.slice(-6)}-${req.body.payment_no}`
                }
            };
            debug('searching a transaction...', conditions);
            const placeOrderTransaction = await transactionRepo.transactionModel.findOne(conditions)
                .exec()
                .then((doc) => {
                    if (doc === null) {
                        throw new ttts.factory.errors.NotFound('transaction');
                    }

                    return <ttts.factory.transaction.placeOrder.ITransaction>doc.toObject();
                });
            debug('placeOrder transaction found.');

            // 取引があれば、返品取引確定
            const returnOrderTransaction = await ttts.service.transaction.returnOrder.confirm({
                clientUser: req.user,
                agentId: req.user.sub,
                transactionId: placeOrderTransaction.id,
                cancellationFee: req.body.cancellation_fee,
                forcibly: req.body.forcibly,
                reason: ttts.factory.transaction.returnOrder.Reason.Customer,
                potentialActions: {
                    returnOrder: {
                        potentialActions: {
                            informOrder: [
                                { recipient: { url: `${req.protocol}://${req.hostname}/webhooks/onReturnOrder` } }
                            ]
                        }
                    }
                }
            })({
                invoice: invoiceRepo,
                transaction: transactionRepo
            });
            debug('returnOrder transaction confirmed.');

            res.status(CREATED)
                .json({
                    id: returnOrderTransaction.id
                });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 返品メール送信
 */
returnOrderTransactionsRouter.post(
    '/:transactionId/tasks/sendEmailNotification',
    permitScopes(['transactions']),
    (req, __2, next) => {
        req.checkBody('sender.name', 'invalid sender')
            .notEmpty()
            .withMessage('sender.name is required');
        req.checkBody('sender.email', 'invalid sender')
            .notEmpty()
            .withMessage('sender.email is required');
        req.checkBody('toRecipient.name', 'invalid toRecipient')
            .notEmpty()
            .withMessage('toRecipient.name is required');
        req.checkBody('toRecipient.email', 'invalid toRecipient')
            .notEmpty()
            .withMessage('toRecipient.email is required')
            .isEmail();
        req.checkBody('about', 'invalid about')
            .notEmpty()
            .withMessage('about is required');
        req.checkBody('text', 'invalid text')
            .notEmpty()
            .withMessage('text is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const task = await ttts.service.transaction.returnOrder.sendEmail(
                req.params.transactionId,
                {
                    typeOf: ttts.factory.creativeWorkType.EmailMessage,
                    sender: {
                        name: req.body.sender.name,
                        email: req.body.sender.email
                    },
                    toRecipient: {
                        name: req.body.toRecipient.name,
                        email: req.body.toRecipient.email
                    },
                    about: req.body.about,
                    text: req.body.text
                }
            )(
                new ttts.repository.Task(mongoose.connection),
                new ttts.repository.Transaction(mongoose.connection)
            );

            res.status(CREATED)
                .json(task);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 取引検索
 */
returnOrderTransactionsRouter.get(
    '',
    permitScopes(['admin']),
    ...[
        query('startFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('startThrough')
            .optional()
            .isISO8601()
            .toDate(),
        query('endFrom')
            .optional()
            .isISO8601()
            .toDate(),
        query('endThrough')
            .optional()
            .isISO8601()
            .toDate()
    ],
    validator,
    async (req, res, next) => {
        try {
            const transactionRepo = new ttts.repository.Transaction(mongoose.connection);
            const searchConditions: ttts.factory.transaction.returnOrder.ISearchConditions = {
                ...req.query,
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
                page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
                sort: (req.query.sort !== undefined) ? req.query.sort : { orderDate: ttts.factory.sortType.Descending },
                typeOf: ttts.factory.transactionType.ReturnOrder
            };
            const transactions = await transactionRepo.search(searchConditions);
            const totalCount = await transactionRepo.count(searchConditions);
            res.set('X-Total-Count', totalCount.toString());
            res.json(transactions);
        } catch (error) {
            next(error);
        }
    }
);

export default returnOrderTransactionsRouter;
