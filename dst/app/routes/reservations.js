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
 * 予約ルーター
 */
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
const reservation_1 = require("../util/reservation");
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
const chevreAuthClient = new ttts.chevre.auth.ClientCredentials({
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
], validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
 * IDで予約取得
 */
reservationsRouter.get('/:id', permitScopes_1.default(['reservations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 予約を検索
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        const reservation = yield reservationRepo.findById({ id: req.params.id });
        res.json(reservation_1.tttsReservation2chevre(reservation));
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
], validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // POSに対する互換性維持のため
        if (typeof req.query.performanceId === 'string' && req.query.performanceId !== '') {
            req.query.performance = req.query.performanceId;
        }
        // 予約検索条件
        const conditions = Object.assign({}, req.query, { 
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
            .json(reservations.map(reservation_1.tttsReservation2chevre));
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
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const projectRepo = new ttts.repository.Project(mongoose.connection);
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        const taskRepo = new ttts.repository.Task(mongoose.connection);
        const project = yield projectRepo.findById({ id: req.project.id });
        if (project.settings === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (project.settings.chevre === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('Project settings not found');
        }
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
            const reservationService = new ttts.chevre.service.Reservation({
                endpoint: project.settings.chevre.endpoint,
                auth: chevreAuthClient
            });
            yield reservationService.attendScreeningEvent(reservation);
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.error('Chevre attendScreeningEvent failed:', error);
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
reservationsRouter.delete('/:id/checkins/:when', permitScopes_1.default(['reservations.checkins']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
reservationsRouter.put('/:id/cancel', permitScopes_1.default(['admin']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield ttts.service.reserve.cancelReservation({ id: req.params.id })({
            reservation: new ttts.repository.Reservation(mongoose.connection),
            task: new ttts.repository.Task(mongoose.connection),
            ticketTypeCategoryRateLimit: new ttts.repository.rateLimit.TicketTypeCategory(redisClient),
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
