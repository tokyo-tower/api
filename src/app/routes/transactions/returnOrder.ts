/**
 * 注文返品取引ルーター(POS専用)
 */
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
import { CREATED } from 'http-status';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

const returnOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

returnOrderTransactionsRouter.use(authentication);

/**
 * 上映日と購入番号で返品
 */
returnOrderTransactionsRouter.post(
    '/confirm',
    permitScopes(['pos', 'transactions']),
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

        next();
    },
    validator,
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            const actionRepo = new ttts.repository.Action(mongoose.connection);
            const invoiceRepo = new ttts.repository.Invoice(mongoose.connection);
            const orderRepo = new ttts.repository.Order(mongoose.connection);
            const projectRepo = new ttts.repository.Project(mongoose.connection);
            const sellerRepo = new ttts.repository.Seller(mongoose.connection);
            const transactionRepo = new ttts.repository.Transaction(mongoose.connection);

            // 確認番号で注文検索
            const confirmationNumber = `${req.body.performance_day}${req.body.payment_no}`;
            const orders = await orderRepo.search({
                limit: 1,
                confirmationNumbers: [confirmationNumber],
                project: { ids: [req.project.id] }
            });
            const order = orders.shift();
            if (order === undefined) {
                throw new ttts.factory.errors.NotFound('Order');
            }

            // 注文取引を検索する
            const placeOrderTransactions = await transactionRepo.search<ttts.factory.transactionType.PlaceOrder>({
                limit: 1,
                typeOf: ttts.factory.transactionType.PlaceOrder,
                result: { order: { orderNumbers: [order.orderNumber] } }
            });
            const placeOrderTransaction = placeOrderTransactions.shift();
            if (placeOrderTransaction === undefined) {
                throw new ttts.factory.errors.NotFound('Transaction');
            }

            // tslint:disable-next-line:max-line-length
            const authorizeSeatReservationActions = <ttts.factory.cinerino.action.authorize.offer.seatReservation.IAction<ttts.factory.cinerino.service.webAPI.Identifier.Chevre>[]>
                placeOrderTransaction.object.authorizeActions
                    .filter(
                        (a) => a.object.typeOf === ttts.factory.cinerino.action.authorize.offer.seatReservation.ObjectType.SeatReservation
                    )
                    .filter((a) => a.actionStatus === ttts.factory.actionStatusType.CompletedActionStatus);

            const informReservationUrl = `${req.protocol}://${req.hostname}/webhooks/onReservationCancelled`;

            const confirmReservationParams: ttts.factory.cinerino.transaction.returnOrder.ICancelReservationParams[] =
                authorizeSeatReservationActions.map((authorizeSeatReservationAction) => {
                    if (authorizeSeatReservationAction.result === undefined) {
                        throw new ttts.factory.errors.NotFound('Result of seat reservation authorize action');
                    }

                    const reserveTransaction = authorizeSeatReservationAction.result.responseBody;

                    return {
                        object: {
                            typeOf: reserveTransaction.typeOf,
                            id: reserveTransaction.id
                        },
                        potentialActions: {
                            cancelReservation: {
                                potentialActions: {
                                    informReservation: [
                                        { recipient: { url: informReservationUrl } }
                                    ]
                                }
                            }
                        }
                    };
                });

            // 注文通知パラメータを生成
            const informOrderParams: ttts.factory.cinerino.transaction.returnOrder.IInformOrderParams[] = [];

            const expires = moment()
                .add(1, 'minute')
                .toDate();

            const potentialActionParams: ttts.factory.transaction.returnOrder.IPotentialActionsParams = {
                returnOrder: {
                    potentialActions: {
                        cancelReservation: confirmReservationParams,
                        informOrder: informOrderParams,
                        refundCreditCard: []
                    }
                }
            };

            // 取引があれば、返品取引進行
            const returnOrderTransaction = await ttts.service.transaction.returnOrder.start({
                project: req.project,
                agent: req.agent,
                expires: expires,
                object: {
                    cancellationFee: Number(req.body.cancellation_fee),
                    clientUser: req.user,
                    order: { orderNumber: order.orderNumber },
                    reason: ttts.factory.transaction.returnOrder.Reason.Customer
                },
                seller: { typeOf: order.seller.typeOf, id: order.seller.id }
            })({
                action: actionRepo,
                invoice: invoiceRepo,
                order: orderRepo,
                project: projectRepo,
                seller: sellerRepo,
                transaction: transactionRepo
            });

            await ttts.service.transaction.returnOrder.confirm({
                id: returnOrderTransaction.id,
                potentialActions: potentialActionParams
            })({
                action: actionRepo,
                seller: sellerRepo,
                transaction: transactionRepo
            });

            res.status(CREATED)
                .json({
                    id: returnOrderTransaction.id
                });
        } catch (error) {
            next(error);
        }
    }
);

export default returnOrderTransactionsRouter;
