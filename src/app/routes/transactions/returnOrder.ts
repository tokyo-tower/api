/**
 * 注文取引ルーター
 * @ignore
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { CREATED } from 'http-status';

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
        req.checkBody('performance_day', 'invalid performance_day').notEmpty().withMessage('performance_day is required');
        req.checkBody('payment_no', 'invalid payment_no').notEmpty().withMessage('payment_no is required');
        req.checkBody('cancellation_fee', 'invalid cancellation_fee').notEmpty().withMessage('cancellation_fee is required').isInt();
        req.checkBody('forcibly', 'invalid forcibly').notEmpty().withMessage('forcibly is required').isBoolean();

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

            // 取引を検索する
            const conditions = {
                typeOf: ttts.factory.transactionType.PlaceOrder,
                'result.eventReservations.performance_day': req.body.performance_day,
                'result.eventReservations.payment_no': req.body.payment_no
            };
            debug('searching a transaction...', conditions);
            const placeOrderTransaction = await transactionRepo.transactionModel.findOne(conditions).exec().then((doc) => {
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
                reason: ttts.factory.transaction.returnOrder.Reason.Customer
            })(transactionRepo);
            debug('returnOrder　transaction confirmed.');

            res.status(CREATED).json({
                id: returnOrderTransaction.id
            });
        } catch (error) {
            next(error);
        }
    }
);

export default returnOrderTransactionsRouter;
