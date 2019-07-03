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
 * パフォーマンスルーター
 */
const ttts = require("@motionpicture/ttts-domain");
const express = require("express");
// tslint:disable-next-line:no-submodule-imports
const check_1 = require("express-validator/check");
const http_status_1 = require("http-status");
const moment = require("moment");
const _ = require("underscore");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const performanceRouter = express.Router();
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    // tslint:disable-next-line:no-magic-numbers
    port: parseInt(process.env.REDIS_PORT, 10),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
performanceRouter.use(authentication_1.default);
/**
 * IDでパフォーマンス検索
 */
performanceRouter.get('/:id', permitScopes_1.default(['performances', 'performances.read-only']), (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const repo = new ttts.repository.Performance(ttts.mongoose.connection);
        const performance = yield repo.findById(req.params.id);
        // POSに対する互換性維持のため、charge属性を追加
        const ticketTypes = performance.ticket_type_group.ticket_types.map((t) => {
            return Object.assign({}, t, { charge: (t.priceSpecification !== undefined) ? t.priceSpecification.price : undefined });
        });
        res.json(Object.assign({}, performance, { ticket_type_group: Object.assign({}, performance.ticket_type_group, { ticket_types: ticketTypes }) }));
    }
    catch (error) {
        next(error);
    }
}));
/**
 * パフォーマンス検索
 */
performanceRouter.get('', permitScopes_1.default(['performances', 'performances.read-only']), ...[
    check_1.query('startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('startThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('endFrom')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('endThrough')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('ttts_extension.online_sales_update_at.$gte')
        .optional()
        .isISO8601()
        .toDate(),
    check_1.query('ttts_extension.online_sales_update_at.$lt')
        .optional()
        .isISO8601()
        .toDate()
], validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 互換性維持のため
        if (!_.isEmpty(req.query.start_from)) {
            req.query.startFrom = moment(req.query.start_from)
                .toDate();
        }
        if (!_.isEmpty(req.query.start_through)) {
            req.query.startThrough = moment(req.query.start_through)
                .toDate();
        }
        // POSへの互換性維持
        if (typeof req.query.day === 'string' && req.query.day.length > 0) {
            req.query.startFrom = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                .toDate();
            req.query.startThrough = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                .add(1, 'day')
                .toDate();
            delete req.query.day;
        }
        const conditions = Object.assign({}, req.query, { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Number(req.query.limit) : 100, page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : 1 });
        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        yield ttts.service.performance.search(conditions)(performanceRepo, new ttts.repository.EventWithAggregation(redisClient))
            .then((searchPerformanceResult) => {
            res.set('X-Total-Count', searchPerformanceResult.numberOfPerformances.toString())
                .json({
                meta: {
                    number_of_performances: searchPerformanceResult.numberOfPerformances,
                    number_of_films: searchPerformanceResult.filmIds.length
                },
                data: searchPerformanceResult.performances
            });
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 拡張属性更新
 */
performanceRouter.put('/:id/extension', permitScopes_1.default(['admin']), (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        yield performanceRepo.updateOne({ _id: req.params.id }, Object.assign({}, (req.body.reservationsAtLastUpdateDate !== undefined)
            ? { 'ttts_extension.reservationsAtLastUpdateDate': req.body.reservationsAtLastUpdateDate }
            : undefined, (req.body.onlineSalesStatus !== undefined)
            ? { 'ttts_extension.online_sales_status': req.body.onlineSalesStatus }
            : undefined, (req.body.onlineSalesStatusUpdateUser !== undefined)
            ? { 'ttts_extension.online_sales_update_user': req.body.onlineSalesStatusUpdateUser }
            : undefined, (req.body.onlineSalesStatusUpdateAt !== undefined && req.body.onlineSalesStatusUpdateAt !== '')
            ? {
                'ttts_extension.online_sales_update_at': moment(req.body.onlineSalesStatusUpdateAt)
                    .toDate()
            }
            : undefined, (req.body.evServiceStatus !== undefined)
            ? { 'ttts_extension.ev_service_status': req.body.evServiceStatus }
            : undefined, (req.body.evServiceStatusUpdateUser !== undefined)
            ? { 'ttts_extension.ev_service_update_user': req.body.evServiceStatusUpdateUser }
            : undefined, (req.body.evServiceStatusUpdateAt !== undefined && req.body.evServiceStatusUpdateAt !== '')
            ? {
                'ttts_extension.ev_service_update_at': moment(req.body.evServiceStatusUpdateAt)
                    .toDate()
            }
            : undefined, (req.body.refundStatus !== undefined)
            ? { 'ttts_extension.refund_status': req.body.refundStatus }
            : undefined, (req.body.refundStatusUpdateUser !== undefined)
            ? { 'ttts_extension.refund_update_user': req.body.refundStatusUpdateUser }
            : undefined, (req.body.refundStatusUpdateAt !== undefined && req.body.refundStatusUpdateAt !== '')
            ? {
                'ttts_extension.refund_update_at': moment(req.body.refundStatusUpdateAt)
                    .toDate()
            }
            : undefined));
        // 集計タスク作成
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);
        const aggregateTask = {
            name: ttts.factory.taskName.AggregateEventReservations,
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            // tslint:disable-next-line:no-null-keyword
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: { id: req.params.id }
        };
        yield taskRepo.save(aggregateTask);
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = performanceRouter;
