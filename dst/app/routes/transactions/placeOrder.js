"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 注文取引ルーター(POS専用)
 */
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const placeOrderTransactionsRouter = express_1.Router();
const authentication_1 = require("../../middlewares/authentication");
const permitScopes_1 = require("../../middlewares/permitScopes");
const validator_1 = require("../../middlewares/validator");
// 車椅子レート制限のためのRedis接続クライアント
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
placeOrderTransactionsRouter.use(authentication_1.default);
placeOrderTransactionsRouter.post('/start', permitScopes_1.default(['pos', 'transactions']), (req, _, next) => {
    req.checkBody('expires', 'invalid expires')
        .notEmpty()
        .withMessage('expires is required')
        .isISO8601();
    req.checkBody('seller_identifier', 'invalid seller_identifier')
        .notEmpty()
        .withMessage('seller_identifier is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const transactionRepo = new ttts.repository.Transaction(mongoose.connection);
        const sellerRepo = new ttts.repository.Seller(mongoose.connection);
        const doc = yield sellerRepo.organizationModel.findOne({
            identifier: req.body.seller_identifier
        })
            .exec();
        if (doc === null) {
            throw new ttts.factory.errors.NotFound('Seller');
        }
        const seller = doc.toObject();
        const transaction = yield ttts.service.transaction.placeOrderInProgress.start({
            project: req.project,
            expires: moment(req.body.expires)
                .toDate(),
            agent: Object.assign({}, req.agent, { identifier: [
                    ...(req.agent.identifier !== undefined) ? req.agent.identifier : [],
                    ...(req.body.agent !== undefined && req.body.agent.identifier !== undefined) ? req.body.agent.identifier : []
                ] }),
            seller: { typeOf: seller.typeOf, id: seller.id },
            object: {
                clientUser: req.user
            }
        })({
            seller: sellerRepo,
            transaction: transactionRepo
        });
        // tslint:disable-next-line:no-string-literal
        // const host = req.headers['host'];
        // res.setHeader('Location', `https://${host}/transactions/${transaction.id}`);
        res.status(http_status_1.CREATED)
            .json(transaction);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 購入者情報を変更する
 */
placeOrderTransactionsRouter.put('/:transactionId/customerContact', permitScopes_1.default(['pos', 'transactions']), (req, _, next) => {
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
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const profile = yield ttts.service.transaction.placeOrderInProgress.updateAgent({
            id: req.params.transactionId,
            agent: Object.assign({}, req.body, { id: req.user.sub, 
                // address: (typeof req.body.address === 'string') ? req.body.address : '',
                // age: (typeof req.body.age === 'string') ? req.body.age : '',
                // email: (typeof req.body.email === 'string') ? req.body.email : '',
                // gender: (typeof req.body.gender === 'string') ? req.body.gender : '',
                givenName: (typeof req.body.first_name === 'string') ? req.body.first_name : '', familyName: (typeof req.body.last_name === 'string') ? req.body.last_name : '', telephone: (typeof req.body.tel === 'string') ? req.body.tel : '', telephoneRegion: (typeof req.body.address === 'string') ? req.body.address : '' })
        })({
            transaction: new ttts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.CREATED)
            .json(Object.assign({}, profile, { 
            // POSへの互換性維持のために値補完
            last_name: profile.familyName, first_name: profile.givenName, tel: profile.telephone }));
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約
 */
placeOrderTransactionsRouter.post('/:transactionId/actions/authorize/seatReservation', permitScopes_1.default(['pos', 'transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        if (!Array.isArray(req.body.offers)) {
            req.body.offers = [];
        }
        const performanceId = req.body.performance_id;
        const action = yield ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.create({
            project: req.project,
            agent: { id: req.user.sub },
            transaction: { id: req.params.transactionId },
            object: {
                event: { id: performanceId },
                acceptedOffers: req.body.offers.map((offer) => {
                    return {
                        ticket_type: offer.ticket_type,
                        watcher_name: offer.watcher_name
                    };
                })
            }
        })(new ttts.repository.Transaction(mongoose.connection), new ttts.repository.Action(mongoose.connection), new ttts.repository.rateLimit.TicketTypeCategory(redisClient), new ttts.repository.Task(mongoose.connection), new ttts.repository.Project(mongoose.connection));
        res.status(http_status_1.CREATED)
            .json(action);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 座席仮予約削除
 */
placeOrderTransactionsRouter.delete('/:transactionId/actions/authorize/seatReservation/:actionId', permitScopes_1.default(['pos', 'transactions']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield ttts.service.transaction.placeOrderInProgress.action.authorize.seatReservation.cancel({
            project: req.project,
            agent: { id: req.user.sub },
            transaction: { id: req.params.transactionId },
            id: req.params.actionId
        })(new ttts.repository.Transaction(mongoose.connection), new ttts.repository.Action(mongoose.connection), new ttts.repository.rateLimit.TicketTypeCategory(redisClient), new ttts.repository.Task(mongoose.connection), new ttts.repository.Project(mongoose.connection));
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
placeOrderTransactionsRouter.post('/:transactionId/confirm', permitScopes_1.default(['pos', 'transactions']), validator_1.default, 
// tslint:disable-next-line:max-func-body-length
(req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const paymentMethodType = req.body.payment_method;
        const actionRepo = new ttts.repository.Action(mongoose.connection);
        const orderNumberRepo = new ttts.repository.OrderNumber(redisClient);
        const paymentNoRepo = new ttts.repository.PaymentNo(redisClient);
        const sellerRepo = new ttts.repository.Seller(mongoose.connection);
        const tokenRepo = new ttts.repository.Token(redisClient);
        const transactionRepo = new ttts.repository.Transaction(mongoose.connection);
        const transaction = yield transactionRepo.findInProgressById({
            typeOf: ttts.factory.transactionType.PlaceOrder,
            id: req.params.transactionId
        });
        const authorizeSeatReservationResult = yield getTmpReservations({
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
        const authorizePaymentMethodAction = yield authorizeOtherPayment({
            agent: { id: req.user.sub },
            paymentMethodType: paymentMethodType,
            amount: authorizeSeatReservationResult.price,
            transaction: { id: req.params.transactionId }
        })({
            action: actionRepo,
            seller: sellerRepo,
            transaction: transactionRepo
        });
        const authorizePaymentMethodActionResult = authorizePaymentMethodAction.result;
        // 確認番号を事前生成
        const eventStartDateStr = moment(event.startDate)
            .tz('Asia/Tokyo')
            .format('YYYYMMDD');
        const paymentNo = yield paymentNoRepo.publish(eventStartDateStr);
        const confirmationNumber = `${eventStartDateStr}${paymentNo}`;
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
                transaction: transaction,
                paymentNo: paymentNo,
                gmoOrderId: authorizePaymentMethodActionResult.paymentMethodId,
                paymentSeatIndex: index.toString(),
                paymentMethodName: authorizePaymentMethodActionResult.name
            });
        });
        const confirmReservationParams = [];
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
                            const orderItem = eventReservations.find((eventReservation) => eventReservation.id === r.id);
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
        const informOrderParams = [
            { recipient: { url: informOrderUrl } }
        ];
        // 決済承認後に注文日時を確定しなければ、取引条件を満たさないので注意
        const orderDate = new Date();
        // 印刷トークンを事前に発行
        const printToken = yield tokenRepo.createPrintToken(acceptedOffers.map((o) => o.itemOffered.id));
        const transactionResult = yield ttts.service.transaction.placeOrderInProgress.confirm({
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
        res.status(http_status_1.CREATED)
            .json(Object.assign({}, transactionResult, { 
            // POSへ互換性維持のためにeventReservations属性を生成
            eventReservations: (transactionResult !== undefined)
                ? transactionResult.order.acceptedOffers
                    .map((o) => {
                    const r = o.itemOffered;
                    return {
                        qr_str: r.id,
                        payment_no: paymentNo,
                        performance: r.reservationFor.id
                    };
                })
                : [], 
            // 印刷トークン情報を追加
            printToken: printToken }));
    }
    catch (error) {
        next(error);
    }
}));
function getTmpReservations(params) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const authorizeActions = yield repos.action.searchByPurpose({
            typeOf: ttts.factory.actionType.AuthorizeAction,
            purpose: {
                typeOf: ttts.factory.transactionType.PlaceOrder,
                id: params.transaction.id
            }
        });
        const seatReservationAuthorizeAction = authorizeActions
            .filter((a) => a.actionStatus === ttts.factory.actionStatusType.CompletedActionStatus)
            .find((a) => a.object.typeOf === ttts.factory.action.authorize.seatReservation.ObjectType.SeatReservation);
        if (seatReservationAuthorizeAction === undefined || seatReservationAuthorizeAction.result === undefined) {
            throw new ttts.factory.errors.Argument('Transaction', 'Seat reservation authorize action required');
        }
        return seatReservationAuthorizeAction.result;
    });
}
function authorizeOtherPayment(params) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        let authorizePaymentMethodAction;
        // クライアントがPOSの場合、決済方法承認アクションを自動生成
        let authorizingPaymentMethodType;
        switch (params.paymentMethodType) {
            case ttts.factory.cinerino.paymentMethodType.Cash:
            case ttts.factory.cinerino.paymentMethodType.CreditCard:
                authorizingPaymentMethodType = params.paymentMethodType;
                break;
            default:
                // その他の決済方法を認められるのは代理予約だけ
                throw new ttts.factory.errors.Argument('paymentMethod', `Invalid payment method for the client`);
        }
        authorizePaymentMethodAction = yield ttts.service.payment.any.authorize({
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
    });
}
/**
 * 仮予約から確定予約を生成する
 */
function temporaryReservation2confirmed(params) {
    const customer = params.transaction.agent;
    const underName = Object.assign({ typeOf: ttts.factory.personType.Person, id: customer.id, name: `${customer.givenName} ${customer.familyName}`, familyName: customer.familyName, givenName: customer.givenName, email: customer.email, telephone: customer.telephone, gender: customer.gender, identifier: [
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
        ] }, { address: customer.address });
    return Object.assign({}, params.chevreReservation, { underName: underName, additionalProperty: [
            ...(Array.isArray(params.reservation.additionalProperty)) ? params.reservation.additionalProperty : [],
            { name: 'paymentSeatIndex', value: params.paymentSeatIndex }
        ], additionalTicketText: params.reservation.additionalTicketText });
}
placeOrderTransactionsRouter.post('/:transactionId/tasks/sendEmailNotification', permitScopes_1.default(['transactions']), (req, __2, next) => {
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
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const task = yield ttts.service.transaction.placeOrder.sendEmail(req.params.transactionId, {
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
        })({
            task: new ttts.repository.Task(mongoose.connection),
            transaction: new ttts.repository.Transaction(mongoose.connection)
        });
        res.status(http_status_1.CREATED)
            .json(task);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = placeOrderTransactionsRouter;
