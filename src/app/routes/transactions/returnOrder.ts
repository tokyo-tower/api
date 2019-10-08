/**
 * 注文返品取引ルーター
 */
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
// tslint:disable-next-line:no-submodule-imports
import { query } from 'express-validator/check';
import { CREATED } from 'http-status';
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
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            const actionRepo = new ttts.repository.Action(mongoose.connection);
            const invoiceRepo = new ttts.repository.Invoice(mongoose.connection);
            const orderRepo = new ttts.repository.Order(mongoose.connection);
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

            const informOrderUrl = `${req.protocol}://${req.hostname}/webhooks/onReturnOrder`;
            const informReservationUrl = `${req.protocol}://${req.hostname}/webhooks/onReservationCancelled`;

            const actionsOnOrder = await actionRepo.searchByOrderNumber({ orderNumber: order.orderNumber });
            const payActions = <ttts.factory.cinerino.action.trade.pay.IAction<ttts.factory.paymentMethodType>[]>actionsOnOrder
                .filter((a) => a.typeOf === ttts.factory.actionType.PayAction)
                .filter((a) => a.actionStatus === ttts.factory.actionStatusType.CompletedActionStatus);

            const emailCustomization = getEmailCustomization({
                placeOrderTransaction: placeOrderTransaction,
                reason: ttts.factory.transaction.returnOrder.Reason.Customer
            });

            // クレジットカード返金アクション
            const refundCreditCardActionsParams =
                await Promise.all((<ttts.factory.cinerino.action.trade.pay.IAction<ttts.factory.paymentMethodType.CreditCard>[]>payActions)
                    .filter((a) => a.object[0].paymentMethod.typeOf === ttts.factory.paymentMethodType.CreditCard)
                    // tslint:disable-next-line:max-line-length
                    .map(async (a) => {
                        return {
                            object: {
                                object: a.object.map((o) => {
                                    return {
                                        paymentMethod: {
                                            paymentMethodId: o.paymentMethod.paymentMethodId
                                        }
                                    };
                                })
                            },
                            potentialActions: {
                                sendEmailMessage: {
                                    /**
                                     * 返金メールカスタマイズ
                                     * メール本文をカスタマイズしたい場合、PUGテンプレートを指定
                                     * 挿入変数として`order`を使用できます
                                     * @see https://pugjs.org/api/getting-started.html
                                     */
                                    ...(emailCustomization !== undefined)
                                        ? { object: emailCustomization }
                                        : undefined
                                }
                            }
                        };
                    }));

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
            const informOrderParams: ttts.factory.cinerino.transaction.returnOrder.IInformOrderParams[] = [
                { recipient: { url: informOrderUrl } }
            ];

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
                            cancelReservation: confirmReservationParams,
                            informOrder: informOrderParams,
                            refundCreditCard: refundCreditCardActionsParams
                        }
                    }
                }
            })({
                action: actionRepo,
                invoice: invoiceRepo,
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

export function getEmailCustomization(params: {
    placeOrderTransaction: ttts.factory.transaction.placeOrder.ITransaction;
    reason: ttts.factory.transaction.returnOrder.Reason;
}) {
    // const placeOrderTransaction = returnOrderTransaction.object.transaction;
    if (params.placeOrderTransaction.result === undefined) {
        throw new ttts.factory.errors.NotFound('PlaceOrder Transaction Result');
    }
    // const order = params.placeOrderTransaction.result.order;

    // let emailMessageAttributes: ttts.factory.creativeWork.message.email.IAttributes;
    const emailMessage: ttts.factory.creativeWork.message.email.ICreativeWork | undefined = undefined;

    switch (params.reason) {
        case ttts.factory.transaction.returnOrder.Reason.Customer:
            // no op

            break;

        case ttts.factory.transaction.returnOrder.Reason.Seller:
            // tslint:disable-next-line:no-suspicious-comment
            // TODO 二重送信対策
            // emailMessageAttributes = await createEmailMessage4sellerReason(params.placeOrderTransaction);
            // emailMessage = {
            //     typeOf: ttts.factory.creativeWorkType.EmailMessage,
            //     identifier: `returnOrderTransaction-${order.orderNumber}`,
            //     name: `returnOrderTransaction-${order.orderNumber}`,
            //     sender: {
            //         typeOf: params.placeOrderTransaction.seller.typeOf,
            //         name: emailMessageAttributes.sender.name,
            //         email: emailMessageAttributes.sender.email
            //     },
            //     toRecipient: {
            //         typeOf: params.placeOrderTransaction.agent.typeOf,
            //         name: emailMessageAttributes.toRecipient.name,
            //         email: emailMessageAttributes.toRecipient.email
            //     },
            //     about: emailMessageAttributes.about,
            //     text: emailMessageAttributes.text
            // };

            break;

        default:
    }

    return emailMessage;
}

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
