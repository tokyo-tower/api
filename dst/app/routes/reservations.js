"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 予約ルーター
 */
const chevre = require("@chevre/api-nodejs-client");
const cinerinoapi = require("@cinerino/api-nodejs-client");
const ttts = require("@tokyotower/domain");
const express = require("express");
// tslint:disable-next-line:no-submodule-imports
const check_1 = require("express-validator/check");
const http_status_1 = require("http-status");
const moment = require("moment");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const project = { typeOf: 'Project', id: process.env.PROJECT_ID };
const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.CHEVRE_CLIENT_ID,
    clientSecret: process.env.CHEVRE_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const reservationsRouter = express.Router();
reservationsRouter.use(authentication_1.default);
/**
 * distinct検索
 */
reservationsRouter.get('/distinct/:field', permitScopes_1.default(['admin']), ...[
    check_1.query('reservationFor.startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('reservationFor.startThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('reservationFor.endFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('reservationFor.endThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('modifiedFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('modifiedThrough')
        .optional()
        .isISO8601()
        .toDate()
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 予約検索条件
        const conditions = Object.assign({}, req.query
        // tslint:disable-next-line:no-magic-numbers
        // limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
        // page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
        // sort: (req.query.sort !== undefined) ? req.query.sort : undefined,
        );
        // 予約を検索
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        const results = yield reservationRepo.distinct(req.params.field, conditions);
        res.json(results);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 注文番号で予約検索
 */
reservationsRouter.get('/findByOrderNumber/:orderNumber', permitScopes_1.default(['transactions', 'reservations.read-only']), ...[], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        // 予約検索条件
        const conditions = {
            typeOf: ttts.factory.chevre.reservationType.EventReservation,
            underName: {
                identifier: { $in: [{ name: 'orderNumber', value: req.params.orderNumber }] }
            }
        };
        // 予約を検索
        const reservations = yield reservationRepo.search(conditions);
        // Chevreへチェックイン連携
        try {
            const reservationService = new cinerinoapi.service.Reservation({
                auth: cinerinoAuthClient,
                endpoint: process.env.CINERINO_API_ENDPOINT,
                project: { id: project.id }
            });
            yield reservationService.checkIn({ reservationNumber: reservations[0].reservationNumber });
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error('Chevre checkInScreeningEventReservations failed:', error);
        }
        res.json(reservations);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * IDで予約取得(実質chevreチェックインapi)
 */
reservationsRouter.get('/:id', permitScopes_1.default(['transactions', 'reservations.read-only']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        // 予約を検索
        const reservation = yield reservationRepo.findById({ id: req.params.id });
        // Chevreへチェックイン連携
        try {
            const reservationService = new cinerinoapi.service.Reservation({
                auth: cinerinoAuthClient,
                endpoint: process.env.CINERINO_API_ENDPOINT,
                project: { id: project.id }
            });
            yield reservationService.checkIn({ id: reservation.id });
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error('Chevre checkInScreeningEventReservations failed:', error);
        }
        res.json(reservation);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 予約検索
 */
reservationsRouter.get('', permitScopes_1.default(['reservations.read-only']), ...[
    check_1.query('reservationFor.startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('reservationFor.startThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('reservationFor.endFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('reservationFor.endThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('modifiedFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('modifiedThrough')
        .optional()
        .isISO8601()
        .toDate()
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // POSに対する互換性維持のため
        if (typeof req.query.performanceId === 'string' && req.query.performanceId !== '') {
            req.query.performance = req.query.performanceId;
        }
        // 予約検索条件
        const conditions = Object.assign(Object.assign({}, req.query), { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100, page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1, sort: (req.query.sort !== undefined) ? req.query.sort : undefined, 
            // デフォルトで余分確保分を除く
            additionalProperty: {
                $nin: [{ name: 'extra', value: '1' }]
            } });
        // 予約を検索
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        const count = yield reservationRepo.count(conditions);
        const reservations = yield reservationRepo.search(conditions);
        res.set('X-Total-Count', count.toString())
            .json(reservations);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 入場
 */
reservationsRouter.post('/:id/checkins', permitScopes_1.default(['reservations.checkins']), (req, __, next) => {
    req.checkBody('when', 'invalid when')
        .notEmpty()
        .withMessage('when is required')
        .isISO8601();
    next();
}, validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        const taskRepo = new ttts.repository.Task(mongoose.connection);
        const checkin = {
            when: moment(req.body.when)
                .toDate(),
            where: req.body.where,
            why: req.body.why,
            how: req.body.how
        };
        const reservation = yield reservationRepo.checkIn({
            id: req.params.id,
            checkin: checkin
        });
        // レポート更新タスク作成
        const taskAttributes = {
            name: ttts.factory.taskName.UpdateOrderReportByReservation,
            project: req.project,
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { reservation: reservation }
        };
        yield taskRepo.save(taskAttributes);
        // 集計タスク作成
        const aggregateTask = {
            name: ttts.factory.taskName.AggregateEventReservations,
            project: req.project,
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { id: reservation.reservationFor.id }
        };
        yield taskRepo.save(aggregateTask);
        // Chevreへ入場連携
        try {
            const reservationService = new cinerinoapi.service.Reservation({
                auth: cinerinoAuthClient,
                endpoint: process.env.CINERINO_API_ENDPOINT,
                project: { id: project.id }
            });
            yield reservationService.attend({ id: reservation.id });
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error('Cinerino reservationService.attend failed:', error);
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 入場取消
 * 入場日時がid
 */
reservationsRouter.delete('/:id/checkins/:when', permitScopes_1.default(['reservations.checkins']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        const taskRepo = new ttts.repository.Task(mongoose.connection);
        const checkin = {
            when: req.params.when,
            where: '',
            why: '',
            how: ''
        };
        const reservation = yield reservationRepo.cancelCheckIn({
            id: req.params.id,
            checkin: checkin
        });
        // レポート更新タスク作成
        const taskAttributes = {
            name: ttts.factory.taskName.UpdateOrderReportByReservation,
            project: req.project,
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { reservation: reservation }
        };
        yield taskRepo.save(taskAttributes);
        // 集計タスク作成
        const aggregateTask = {
            name: ttts.factory.taskName.AggregateEventReservations,
            project: req.project,
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { id: reservation.reservationFor.id }
        };
        yield taskRepo.save(aggregateTask);
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 予約キャンセル
 */
reservationsRouter.put('/:id/cancel', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield cancelReservation({ id: req.params.id })({
            reservation: new ttts.repository.Reservation(mongoose.connection),
            task: new ttts.repository.Task(mongoose.connection),
            // ticketTypeCategoryRateLimit: new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
            project: new ttts.repository.Project(mongoose.connection)
        });
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = reservationsRouter;
/**
 * 予約をキャンセルする
 */
function cancelReservation(params) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const projectDetails = yield repos.project.findById({ id: project.id });
        if (projectDetails.settings === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (projectDetails.settings.chevre === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('Project settings not found');
        }
        const cancelReservationService = new chevre.service.transaction.CancelReservation({
            endpoint: projectDetails.settings.chevre.endpoint,
            auth: cinerinoAuthClient
        });
        // const reservationService = new chevre.service.Reservation({
        //     endpoint: projectDetails.settings.chevre.endpoint,
        //     auth: cinerinoAuthClient
        // });
        const reservation = yield repos.reservation.findById(params);
        // let extraReservations: chevre.factory.reservation.IReservation<ttts.factory.chevre.reservationType.EventReservation>[] = [];
        // 車椅子余分確保があればそちらもキャンセル
        // if (reservation.additionalProperty !== undefined) {
        //     const extraSeatNumbersProperty = reservation.additionalProperty.find((p) => p.name === 'extraSeatNumbers');
        //     if (extraSeatNumbersProperty !== undefined) {
        //         const extraSeatNumbers = JSON.parse(extraSeatNumbersProperty.value);
        //         // このイベントの予約から余分確保分を検索
        //         if (Array.isArray(extraSeatNumbers) && extraSeatNumbers.length > 0) {
        //             const searchExtraReservationsResult =
        //                 await reservationService.search<ttts.factory.chevre.reservationType.EventReservation>({
        //                     limit: 100,
        //                     typeOf: ttts.factory.chevre.reservationType.EventReservation,
        //                     reservationFor: { id: reservation.reservationFor.id },
        //                     reservationNumbers: [reservation.reservationNumber],
        //                     reservedTicket: {
        //                         ticketedSeat: { seatNumbers: extraSeatNumbers }
        //                     }
        //                 });
        //             extraReservations = searchExtraReservationsResult.data;
        //         }
        //     }
        // }
        // const targetReservations = [reservation, ...extraReservations];
        const targetReservations = [reservation];
        yield Promise.all(targetReservations.map((r) => __awaiter(this, void 0, void 0, function* () {
            const cancelReservationTransaction = yield cancelReservationService.start({
                project: project,
                typeOf: ttts.factory.chevre.transactionType.CancelReservation,
                agent: {
                    typeOf: ttts.factory.personType.Person,
                    id: 'tokyotower',
                    name: '@tokyotower/domain'
                },
                object: {
                    reservation: { id: r.id }
                },
                expires: moment()
                    // tslint:disable-next-line:no-magic-numbers
                    .add(1, 'minutes')
                    .toDate()
            });
            yield cancelReservationService.confirm(cancelReservationTransaction);
            // 東京タワーDB側の予約もステータス変更
            yield repos.reservation.cancel({ id: r.id });
        })));
    });
}
exports.cancelReservation = cancelReservation;
