/**
 * 注文取引ルーター
 * @ignore
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { Router } from 'express';
import { ACCEPTED } from 'http-status';

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
    validator,
    async (req, res, next) => {
        try {
            const transactionRepo = new ttts.repository.Transaction(ttts.mongoose.connection);

            // POS購入の取引を検索する
            const conditions = {
                typeOf: ttts.factory.transactionType.PlaceOrder,
                'agent.id': req.user.sub, // POSで購入された場合、販売者IDが同一のはず
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
            await ttts.service.transaction.returnOrder.confirm({
                agentId: req.user.sub,
                transactionId: placeOrderTransaction.id,
                cancellationFee: req.body.cancellation_fee,
                forcibly: false
            })(transactionRepo);
            debug('returnOrder　transaction confirmed.');

            res.status(ACCEPTED).end();
        } catch (error) {
            next(error);
        }
    }
);

export default returnOrderTransactionsRouter;
