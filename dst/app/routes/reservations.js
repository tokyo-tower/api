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
exports.cancelReservation = void 0;
/**
 * 予約ルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const ttts = require("@tokyotower/domain");
const express = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const rateLimit_1 = require("../middlewares/rateLimit");
const validator_1 = require("../middlewares/validator");
const DISABLE_UPDATE_ORDER_REPORT_TASK = process.env.DISABLE_UPDATE_ORDER_REPORT_TASK === '1';
const project = {
    typeOf: cinerinoapi.factory.chevre.organizationType.Project,
    id: process.env.PROJECT_ID
};
const reservationsRouter = express.Router();
reservationsRouter.use(authentication_1.default);
reservationsRouter.use(rateLimit_1.default);
/**
 * distinct検索
 */
reservationsRouter.get('/distinct/:field', permitScopes_1.default(['admin']), ...[
    express_validator_1.query('reservationFor.startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('reservationFor.startThrough')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('reservationFor.endFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('reservationFor.endThrough')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('modifiedFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('modifiedThrough')
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
 * IDで予約取得(実質chevreチェックインapi)
 */
reservationsRouter.get('/:id', permitScopes_1.default(['transactions', 'reservations.read-only']), validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        // 予約を検索
        const reservation = yield reservationRepo.findById({ id: req.params.id });
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
    express_validator_1.query('reservationFor.startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('reservationFor.startThrough')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('reservationFor.endFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('reservationFor.endThrough')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('modifiedFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('modifiedThrough')
        .optional()
        .isISO8601()
        .toDate()
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const noTotalCount = req.query.noTotalCount === '1';
        // POSに対する互換性維持のため
        if (typeof req.query.performanceId === 'string' && req.query.performanceId !== '') {
            req.query.performance = req.query.performanceId;
        }
        // 予約検索条件
        const conditions = Object.assign(Object.assign({}, req.query), { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100, page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1, sort: (req.query.sort !== undefined) ? req.query.sort : { modifiedTime: ttts.factory.sortType.Descending } });
        // 予約を検索
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        let count;
        if (!noTotalCount) {
            count = yield reservationRepo.count(conditions);
        }
        const reservations = yield reservationRepo.search(conditions);
        if (typeof count === 'number') {
            res.set('X-Total-Count', count.toString());
        }
        res.json(reservations);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 入場
 */
reservationsRouter.post('/:id/checkins', permitScopes_1.default(['reservations.checkins']), ...[
    express_validator_1.body('when')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
        .isISO8601()
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let chevreUseActionId;
        // 注文トークンの指定があればcinerinoで予約使用
        const token = (_a = req.body.instrument) === null || _a === void 0 ? void 0 : _a.token;
        if (typeof token === 'string' && token.length > 0) {
            const authClient = new cinerinoapi.auth.ClientCredentials({
                domain: '',
                clientId: '',
                clientSecret: '',
                scopes: [],
                state: ''
            });
            authClient.setCredentials({ access_token: req.accessToken });
            const reservationService = new cinerinoapi.service.Reservation({
                auth: authClient,
                endpoint: process.env.CINERINO_API_ENDPOINT,
                project: { id: project.id }
            });
            const useResult = yield reservationService.useByToken(Object.assign({ object: { id: req.params.id }, instrument: { token }, location: { identifier: req.body.where } }, {
                includesActionId: '1'
            }));
            if (useResult !== undefined) {
                chevreUseActionId = useResult.id;
            }
        }
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        const taskRepo = new ttts.repository.Task(mongoose.connection);
        const checkin = Object.assign({ when: moment(req.body.when)
                .toDate(), where: req.body.where, why: req.body.why, how: req.body.how }, (typeof chevreUseActionId === 'string') ? { id: chevreUseActionId } : undefined);
        const reservation = yield reservationRepo.checkIn({
            id: req.params.id,
            checkin: checkin
        });
        if (!DISABLE_UPDATE_ORDER_REPORT_TASK) {
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
    var _b;
    try {
        const reservationRepo = new ttts.repository.Reservation(mongoose.connection);
        const taskRepo = new ttts.repository.Task(mongoose.connection);
        let reservation = yield reservationRepo.findById({ id: req.params.id });
        const deletingCheckin = (_b = reservation.checkins) === null || _b === void 0 ? void 0 : _b.find((c) => {
            return moment(c.when)
                .isSame(moment(req.params.when));
        });
        if (deletingCheckin !== undefined) {
            // checkinにアクションIDが存在すれば、Chevre予約使用アクション取消
            if (typeof deletingCheckin.id === 'string') {
                const actionId = deletingCheckin.id;
                const authClient = new cinerinoapi.auth.ClientCredentials({
                    domain: '',
                    clientId: '',
                    clientSecret: '',
                    scopes: [],
                    state: ''
                });
                authClient.setCredentials({ access_token: req.accessToken });
                const reservationService = new cinerinoapi.service.Reservation({
                    auth: authClient,
                    endpoint: process.env.CINERINO_API_ENDPOINT,
                    project: { id: project.id }
                });
                try {
                    yield reservationService.cancelUseAction({
                        id: actionId,
                        object: { id: reservation.id }
                    });
                }
                catch (error) {
                    // tslint:disable-next-line:no-console
                    console.log('cancelUseAction failed.', error);
                }
            }
            const checkin = {
                when: req.params.when,
                where: '',
                why: '',
                how: ''
            };
            reservation = yield reservationRepo.cancelCheckIn({
                id: req.params.id,
                checkin: checkin
            });
        }
        if (!DISABLE_UPDATE_ORDER_REPORT_TASK) {
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
        }
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
        yield cancelReservation({
            req: req,
            id: req.params.id
        })({
            reservation: new ttts.repository.Reservation(mongoose.connection),
            task: new ttts.repository.Task(mongoose.connection)
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
        const authClient = new cinerinoapi.auth.ClientCredentials({
            domain: '',
            clientId: '',
            clientSecret: '',
            scopes: [],
            state: ''
        });
        authClient.setCredentials({ access_token: params.req.accessToken });
        const reservationService = new cinerinoapi.service.Reservation({
            auth: authClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        yield reservationService.cancel({
            project: project,
            typeOf: ttts.factory.chevre.transactionType.CancelReservation,
            agent: {
                typeOf: cinerinoapi.factory.personType.Person,
                id: 'tokyotower',
                name: '@tokyotower/domain'
            },
            object: {
                reservation: { id: params.id }
            },
            expires: moment()
                // tslint:disable-next-line:no-magic-numbers
                .add(1, 'minutes')
                .toDate()
        });
        // 東京タワーDB側の予約もステータス変更
        yield repos.reservation.cancel({ id: params.id });
    });
}
exports.cancelReservation = cancelReservation;
