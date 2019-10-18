/**
 * 注文取引ルーター(POS専用)
 */
import * as ttts from '@tokyotower/domain';
import { Router } from 'express';
import { CREATED, NO_CONTENT } from 'http-status';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

const placeOrderTransactionsRouter = Router();

import authentication from '../../middlewares/authentication';
import permitScopes from '../../middlewares/permitScopes';
import validator from '../../middlewares/validator';

// 車椅子レート制限のためのRedis接続クライアント
const redisClient = ttts.redis.createClient({
    host: <string>process.env.REDIS_HOST,
    port: Number(<string>process.env.REDIS_PORT),
    password: <string>process.env.REDIS_KEY,
    tls: { servername: <string>process.env.REDIS_HOST }
});

placeOrderTransactionsRouter.use(authentication);

placeOrderTransactionsRouter.post(
    '/start',
    permitScopes(['pos', 'transactions']),
    (req, _, next) => {
        req.checkBody('expires', 'invalid expires')
            .notEmpty()
            .withMessage('expires is required')
            .isISO8601();
        req.checkBody('seller_identifier', 'invalid seller_identifier')
            .notEmpty()
            .withMessage('seller_identifier is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const transactionRepo = new ttts.repository.Transaction(mongoose.connection);
            const sellerRepo = new ttts.repository.Seller(mongoose.connection);

            const doc = await sellerRepo.organizationModel.findOne({
                identifier: req.body.seller_identifier
            })
                .exec();
            if (doc === null) {
                throw new ttts.factory.errors.NotFound('Seller');
            }
            const seller = doc.toObject();

            const transaction = await ttts.service.transaction.placeOrderInProgress.start({
                project: req.project,
                expires: moment(req.body.expires)
                    .toDate(),
                agent: {
                    ...req.agent,
                    identifier: [
                        ...(req.agent.identifier !== undefined) ? req.agent.identifier : [],
                        ...(req.body.agent !== undefined && req.body.agent.identifier !== undefined) ? req.body.agent.identifier : []
                    ]
                },
                seller: { typeOf: seller.typeOf, id: seller.id },
                object: {
                    clientUser: req.user
                }
            })({
                seller: sellerRepo,
                transaction: transactionRepo
            }
            );

            // tslint:disable-next-line:no-string-literal
            // const host = req.headers['host'];
            // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
            res.status(CREATED)
                .json(transaction);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put(
    '/:transactionId/customerContact',
    permitScopes(['pos', 'transactions']),
    (req, _, next) => {
        req.checkBody('last_name')
            .notEmpty()
            .withMessage('required');
        req.checkBody('first_name')
            .notEmpty()
            .withMessage('required');
        req.checkBody('tel')
            .notEmpty()
            .withMessage('required');
        req.checkBody('email')
            .notEmpty()
            .withMessage('required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const profile = await ttts.service.transaction.placeOrderInProgress.updateAgent({
                id: req.params.transactionId,
                agent: {
                    ...req.body,
                    id: req.user.sub,
                    // address: (typeof req.body.address === 'string') ? req.body.address : '',
                    // age: (typeof req.body.age === 'string') ? req.body.age : '',
                    // email: (typeof req.body.email === 'string') ? req.body.email : '',
                    // gender: (typeof req.body.gender === 'string') ? req.body.gender : '',
                    givenName: (typeof req.body.first_name === 'string') ? req.body.first_name : '',
                    familyName: (typeof req.body.last_name === 'string') ? req.body.last_name : '',
                    telephone: (typeof req.body.tel === 'string') ? req.body.tel : '',
                    telephoneRegion: (typeof req.body.address === 'string') ? req.body.address : ''
                }
            })({
                transaction: new ttts.repository.Transaction(mongoose.connection)
            });

            res.status(CREATED)
                .json({
                    ...profile,
                    // POSへの互換性維持のために値補完
                    last_name: profile.familyName,
                    first_name: profile.givenName,
                    tel: profile.telephone
                });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post(
    '/:transactionId/actions/authorize/seatReservation',
    permitScopes(['pos', 'transactions']),
    validator,
    async (req, res, next) => {
        try {
            if (!Array.isArray(req.body.offers)) {
                req.body.offers = [];
            }

            const performanceId: string = req.body.performance_id;

            const action = await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create({
                project: req.project,
                agent: { id: req.user.sub },
                transaction: { id: req.params.transactionId },
                object: {
                    event: { id: performanceId },
                    acceptedOffers: (<any[]>req.body.offers).map((offer) => {
                        return {
                            ticket_type: offer.ticket_type,
                            watcher_name: offer.watcher_name
                        };
                    })
                }
            })(
                new ttts.repository.Transaction(mongoose.connection),
                new ttts.repository.Action(mongoose.connection),
                new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
                new ttts.repository.Task(mongoose.connection),
                new ttts.repository.Project(mongoose.connection)
            );

            res.status(CREATED)
                .json(action);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete(
    '/:transactionId/actions/authorize/seatReservation/:actionId',
    permitScopes(['pos', 'transactions']),
    validator,
    async (req, res, next) => {
        try {
            await ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel({
                project: req.project,
                agent: { id: req.user.sub },
                transaction: { id: req.params.transactionId },
                id: req.params.actionId
            })(
                new ttts.repository.Transaction(mongoose.connection),
                new ttts.repository.Action(mongoose.connection),
                new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
                new ttts.repository.Task(mongoose.connection),
                new ttts.repository.Project(mongoose.connection)
            );

            res.status(NO_CONTENT)
                .end();
        } catch (error) {
            next(error);
        }
    }
);

placeOrderTransactionsRouter.post(
    '/:transactionId/confirm',
    permitScopes(['pos', 'transactions']),
    validator,
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        try {
            const paymentMethodType = req.body.payment_method;

            const actionRepo = new ttts.repository.Action(mongoose.connection);
            const orderNumberRepo = new ttts.repository.OrderNumber(redisClient);
            const paymentNoRepo = new ttts.repository.PaymentNo(redisClient);
            const sellerRepo = new ttts.repository.Seller(mongoose.connection);
            const tokenRepo = new ttts.repository.Token(redisClient);
            const transactionRepo = new ttts.repository.Transaction(mongoose.connection);

            const transaction = await transactionRepo.findInProgressById<ttts.factory.cinerino.transactionType.PlaceOrder>({
                typeOf: ttts.factory.transactionType.PlaceOrder,
                id: req.params.transactionId
            });

            const authorizeSeatReservationResult = await getTmpReservations({
                transaction: { id: req.params.transactionId }
            })({
                action: actionRepo
            });
            const acceptedOffers = (Array.isArray(authorizeSeatReservationResult.acceptedOffers))
                ? authorizeSeatReservationResult.acceptedOffers
                : [];
            const reserveTransaction = authorizeSeatReservationResult.responseBody;
            if (reserveTransaction === undefined) {
                throw new ttts.factory.errors.Argument('Transaction', 'Reserve trasaction required');
            }
            const chevreReservations = (Array.isArray(reserveTransaction.object.reservations))
                ? reserveTransaction.object.reservations
                : [];
            const event = reserveTransaction.object.reservationFor;
            if (event === undefined || event === null) {
                throw new ttts.factory.errors.Argument('Transaction', 'Event required');
            }

            // クライアントがPOSあるいは内部予約の場合、決済方法承認アクションを自動生成
            const authorizePaymentMethodAction = await authorizeOtherPayment({
                agent: { id: req.user.sub },
                paymentMethodType: paymentMethodType,
                amount: authorizeSeatReservationResult.price,
                transaction: { id: req.params.transactionId }
            })({
                action: actionRepo,
                seller: sellerRepo,
                transaction: transactionRepo
            });
            const authorizePaymentMethodActionResult = <ttts.factory.cinerino.action.authorize.paymentMethod.any.IResult<any>>
                authorizePaymentMethodAction.result;

            // 確認番号を事前生成
            const eventStartDateStr = moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('YYYYMMDD');
            const paymentNo = await paymentNoRepo.publish(eventStartDateStr);
            const confirmationNumber: string = `${eventStartDateStr}${paymentNo}`;

            const informOrderUrl = `${req.protocol}://${req.hostname}/webhooks/onPlaceOrder`;
            const informReservationUrl = `${req.protocol}://${req.hostname}/webhooks/onReservationConfirmed`;

            // 予約確定パラメータを生成
            const eventReservations = acceptedOffers.map((acceptedOffer, index) => {
                const reservation = acceptedOffer.itemOffered;

                const chevreReservation = chevreReservations.find((r) => r.id === reservation.id);
                if (chevreReservation === undefined) {
                    throw new ttts.factory.errors.Argument('Transaction', `Unexpected temporary reservation: ${reservation.id}`);
                }

                return temporaryReservation2confirmed({
                    reservation: reservation,
                    chevreReservation: chevreReservation,
                    transaction: <any>transaction,
                    paymentNo: paymentNo,
                    gmoOrderId: authorizePaymentMethodActionResult.paymentMethodId,
                    paymentSeatIndex: index.toString(),
                    paymentMethodName: authorizePaymentMethodActionResult.name
                });
            });

            const confirmReservationParams: ttts.factory.transaction.placeOrder.IConfirmReservationParams[] = [];
            confirmReservationParams.push({
                object: {
                    typeOf: reserveTransaction.typeOf,
                    id: reserveTransaction.id,
                    object: {
                        reservations: [
                            ...eventReservations.map((r) => {
                                // プロジェクト固有の値を連携
                                return {
                                    id: r.id,
                                    additionalTicketText: r.additionalTicketText,
                                    underName: r.underName,
                                    additionalProperty: r.additionalProperty
                                };
                            }),
                            // 余分確保分の予約にもextraプロパティを連携
                            ...chevreReservations.filter((r) => {
                                // 注文アイテムに存在しない予約(余分確保分)にフィルタリング
                                const orderItem = eventReservations.find(
                                    (eventReservation) => eventReservation.id === r.id
                                );

                                return orderItem === undefined;
                            })
                                .map((r) => {
                                    return {
                                        id: r.id,
                                        additionalProperty: [
                                            { name: 'extra', value: '1' }
                                        ]
                                    };
                                })
                        ]
                    },
                    potentialActions: {
                        reserve: {
                            potentialActions: {
                                informReservation: [
                                    { recipient: { url: informReservationUrl } }
                                ]
                            }
                        }
                    }
                }
            });

            // 注文通知パラメータを生成
            const informOrderParams: ttts.factory.transaction.placeOrder.IInformOrderParams[] = [
                { recipient: { url: informOrderUrl } }
            ];

            // 決済承認後に注文日時を確定しなければ、取引条件を満たさないので注意
            const orderDate = new Date();

            // 印刷トークンを事前に発行
            const printToken = await tokenRepo.createPrintToken(acceptedOffers.map((o) => o.itemOffered.id));

            const transactionResult = await ttts.service.transaction.placeOrderInProgress.confirm({
                project: req.project,
                agent: { id: req.user.sub },
                id: req.params.transactionId,
                potentialActions: {
                    order: {
                        potentialActions: {
                            sendOrder: {
                                potentialActions: {
                                    confirmReservation: confirmReservationParams
                                }
                            },
                            informOrder: informOrderParams
                        }
                    }
                },
                result: {
                    order: {
                        orderDate: orderDate,
                        confirmationNumber: confirmationNumber
                    }
                }
            })({
                action: actionRepo,
                orderNumber: orderNumberRepo,
                seller: sellerRepo,
                transaction: transactionRepo
            });

            res.status(CREATED)
                .json({
                    ...transactionResult,
                    // POSへ互換性維持のためにeventReservations属性を生成
                    eventReservations: (transactionResult !== undefined)
                        ? transactionResult.order.acceptedOffers
                            .map((o) => {
                                const r = <ttts.factory.order.IReservation>o.itemOffered;

                                return {
                                    qr_str: r.id,
                                    payment_no: paymentNo,
                                    performance: r.reservationFor.id
                                };
                            })
                        : [],
                    // 印刷トークン情報を追加
                    printToken: printToken
                });
        } catch (error) {
            next(error);
        }
    }
);

function getTmpReservations(params: {
    transaction: { id: string };
}) {
    return async (repos: {
        action: ttts.repository.Action;
    }): Promise<ttts.factory.action.authorize.seatReservation.IResult> => {
        const authorizeActions = await repos.action.searchByPurpose({
            typeOf: ttts.factory.actionType.AuthorizeAction,
            purpose: {
                typeOf: ttts.factory.transactionType.PlaceOrder,
                id: params.transaction.id
            }
        });
        const seatReservationAuthorizeAction = <ttts.factory.action.authorize.seatReservation.IAction | undefined>
            authorizeActions
                .filter((a) => a.actionStatus === ttts.factory.actionStatusType.CompletedActionStatus)
                .find((a) => a.object.typeOf === ttts.factory.action.authorize.seatReservation.ObjectType.SeatReservation);
        if (seatReservationAuthorizeAction === undefined || seatReservationAuthorizeAction.result === undefined) {
            throw new ttts.factory.errors.Argument('Transaction', 'Seat reservation authorize action required');
        }

        return seatReservationAuthorizeAction.result;
    };
}

function authorizeOtherPayment(params: {
    agent: { id: string };
    paymentMethodType: ttts.factory.cinerino.paymentMethodType;
    amount: number;
    transaction: { id: string };
}) {
    return async (repos: {
        action: ttts.repository.Action;
        seller: ttts.repository.Seller;
        transaction: ttts.repository.Transaction;
    }) => {
        let authorizePaymentMethodAction: ttts.factory.cinerino.action.authorize.paymentMethod.any.IAction<any> | undefined;

        // クライアントがPOSの場合、決済方法承認アクションを自動生成
        let authorizingPaymentMethodType: string;
        switch (params.paymentMethodType) {
            case ttts.factory.cinerino.paymentMethodType.Cash:
            case ttts.factory.cinerino.paymentMethodType.CreditCard:
                authorizingPaymentMethodType = params.paymentMethodType;
                break;

            default:
                // その他の決済方法を認められるのは代理予約だけ
                throw new ttts.factory.errors.Argument('paymentMethod', `Invalid payment method for the client`);
        }

        authorizePaymentMethodAction = await ttts.service.payment.any.authorize({
            agent: { id: params.agent.id },
            object: {
                typeOf: authorizingPaymentMethodType,
                name: params.paymentMethodType,
                additionalProperty: [],
                amount: params.amount
            },
            purpose: { typeOf: ttts.factory.transactionType.PlaceOrder, id: params.transaction.id }
        })(repos);

        return authorizePaymentMethodAction;
    };
}

/**
 * 仮予約から確定予約を生成する
 */
function temporaryReservation2confirmed(params: {
    reservation: ttts.factory.order.IReservation;
    chevreReservation: ttts.factory.chevre.reservation.IReservation<ttts.factory.chevre.reservationType.EventReservation>;
    transaction: ttts.factory.cinerino.transaction.ITransaction<ttts.factory.cinerino.transactionType.PlaceOrder>;
    paymentNo: string;
    gmoOrderId: string;
    paymentSeatIndex: string;
    paymentMethodName: string;
}): ttts.factory.chevre.reservation.IReservation<ttts.factory.chevre.reservationType.EventReservation> {
    const customer = params.transaction.agent;

    const underName: ttts.factory.chevre.reservation.IUnderName<ttts.factory.chevre.reservationType.EventReservation> = {
        typeOf: ttts.factory.personType.Person,
        id: customer.id,
        name: `${customer.givenName} ${customer.familyName}`,
        familyName: customer.familyName,
        givenName: customer.givenName,
        email: customer.email,
        telephone: customer.telephone,
        gender: customer.gender,
        identifier: [
            { name: 'paymentNo', value: params.paymentNo },
            { name: 'transaction', value: params.transaction.id },
            { name: 'gmoOrderId', value: params.gmoOrderId },
            ...(typeof customer.age === 'string')
                ? [{ name: 'age', value: customer.age }]
                : [],
            ...(customer.identifier !== undefined) ? customer.identifier : [],
            ...(customer.memberOf !== undefined && customer.memberOf.membershipNumber !== undefined)
                ? [{ name: 'username', value: customer.memberOf.membershipNumber }]
                : [],
            ...(params.paymentMethodName !== undefined)
                ? [{ name: 'paymentMethod', value: params.paymentMethodName }]
                : []
        ],
        ...{ address: customer.address }
    };

    return {
        ...params.chevreReservation,
        underName: underName,
        additionalProperty: [
            ...(Array.isArray(params.reservation.additionalProperty)) ? params.reservation.additionalProperty : [],
            { name: 'paymentSeatIndex', value: params.paymentSeatIndex }
        ],
        additionalTicketText: params.reservation.additionalTicketText
    };
}

placeOrderTransactionsRouter.post(
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
            const task = await ttts.service.transaction.placeOrder.sendEmail(
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
            )({
                task: new ttts.repository.Task(mongoose.connection),
                transaction: new ttts.repository.Transaction(mongoose.connection)
            });

            res.status(CREATED)
                .json(task);
        } catch (error) {
            next(error);
        }
    }
);

export default placeOrderTransactionsRouter;
