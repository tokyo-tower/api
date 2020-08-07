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
 * パフォーマンスルーター
 */
const ttts = require("@tokyotower/domain");
const express = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const rateLimit_1 = require("../middlewares/rateLimit");
const validator_1 = require("../middlewares/validator");
const performance_1 = require("../service/performance");
const performanceRouter = express.Router();
performanceRouter.use(authentication_1.default);
performanceRouter.use(rateLimit_1.default);
/**
 * IDでパフォーマンス検索
 */
performanceRouter.get('/:id', permitScopes_1.default(['transactions', 'pos']), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const repo = new ttts.repository.Performance(mongoose.connection);
        const performance = yield repo.findById(req.params.id);
        res.json(performance);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * パフォーマンス検索
 */
performanceRouter.get('', permitScopes_1.default(['transactions', 'pos']), ...[
    express_validator_1.query('startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('startThrough')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('endFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('endThrough')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('ttts_extension.online_sales_update_at.$gte')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('ttts_extension.online_sales_update_at.$lt')
        .optional()
        .isISO8601()
        .toDate()
], validator_1.default, 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countDocuments = req.query.countDocuments === '1';
        const useLegacySearch = req.query.useLegacySearch === '1';
        const useExtension = req.query.useExtension === '1';
        if (useLegacySearch) {
            // POSへの互換性維持
            if (req.query.day !== undefined) {
                if (typeof req.query.day === 'string' && req.query.day.length > 0) {
                    req.query.startFrom = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .toDate();
                    req.query.startThrough = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate();
                    delete req.query.day;
                }
                if (typeof req.query.day === 'object') {
                    // day: { '$gte': '20190603', '$lte': '20190802' } } の場合
                    if (req.query.day.$gte !== undefined) {
                        req.query.startFrom = moment(`${req.query.day.$gte}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .toDate();
                    }
                    if (req.query.day.$lte !== undefined) {
                        req.query.startThrough = moment(`${req.query.day.$lte}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .add(1, 'day')
                            .toDate();
                    }
                    delete req.query.day;
                }
            }
            const conditions = Object.assign(Object.assign({}, req.query), { 
                // tslint:disable-next-line:no-magic-numbers
                limit: (req.query.limit !== undefined) ? Number(req.query.limit) : 100, page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : 1, sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: 1 }, 
                // POSへの互換性維持のためperformanceIdを補完
                ids: (typeof req.query.performanceId === 'string') ? [String(req.query.performanceId)] : undefined });
            const performanceRepo = new ttts.repository.Performance(mongoose.connection);
            let totalCount;
            if (countDocuments) {
                totalCount = yield performanceRepo.count(conditions);
            }
            const performances = yield performance_1.search(conditions, useExtension)({ performance: performanceRepo });
            if (typeof totalCount === 'number') {
                res.set('X-Total-Count', totalCount.toString());
            }
            res.json({ data: performances });
        }
        else {
            const events = yield performance_1.searchByChevre(req.query)();
            res.json({ data: events });
        }
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 拡張属性更新
 */
performanceRouter.put('/:id/extension', permitScopes_1.default(['admin']), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const performanceRepo = new ttts.repository.Performance(mongoose.connection);
        yield performanceRepo.updateOne({ _id: req.params.id }, Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (req.body.reservationsAtLastUpdateDate !== undefined)
            ? { 'ttts_extension.reservationsAtLastUpdateDate': req.body.reservationsAtLastUpdateDate }
            : undefined), (req.body.onlineSalesStatus !== undefined)
            ? {
                'ttts_extension.online_sales_status': req.body.onlineSalesStatus,
                onlineSalesStatus: req.body.onlineSalesStatus,
                eventStatus: (req.body.onlineSalesStatus === ttts.factory.performance.OnlineSalesStatus.Normal)
                    ? ttts.factory.chevre.eventStatusType.EventScheduled
                    : ttts.factory.chevre.eventStatusType.EventCancelled
            }
            : undefined), (req.body.onlineSalesStatusUpdateUser !== undefined)
            ? { 'ttts_extension.online_sales_update_user': req.body.onlineSalesStatusUpdateUser }
            : undefined), (req.body.onlineSalesStatusUpdateAt !== undefined && req.body.onlineSalesStatusUpdateAt !== '')
            ? {
                'ttts_extension.online_sales_update_at': moment(req.body.onlineSalesStatusUpdateAt)
                    .toDate()
            }
            : undefined), (req.body.evServiceStatus !== undefined)
            ? {
                'ttts_extension.ev_service_status': req.body.evServiceStatus,
                evServiceStatus: req.body.evServiceStatus
            }
            : undefined), (req.body.evServiceStatusUpdateUser !== undefined)
            ? { 'ttts_extension.ev_service_update_user': req.body.evServiceStatusUpdateUser }
            : undefined), (req.body.evServiceStatusUpdateAt !== undefined && req.body.evServiceStatusUpdateAt !== '')
            ? {
                'ttts_extension.ev_service_update_at': moment(req.body.evServiceStatusUpdateAt)
                    .toDate()
            }
            : undefined), (typeof req.body.refundCount === 'number' || typeof req.body.refundCount === 'string')
            ? { 'ttts_extension.refunded_count': Number(req.body.refundCount) }
            : undefined), (typeof req.body.unrefundCount === 'number' || typeof req.body.unrefundCount === 'string')
            ? { 'ttts_extension.unrefunded_count': Number(req.body.unrefundCount) }
            : undefined), (req.body.refundStatus !== undefined)
            ? { 'ttts_extension.refund_status': req.body.refundStatus }
            : undefined), (req.body.refundStatusUpdateUser !== undefined)
            ? { 'ttts_extension.refund_update_user': req.body.refundStatusUpdateUser }
            : undefined), (req.body.refundStatusUpdateAt !== undefined && req.body.refundStatusUpdateAt !== '')
            ? {
                'ttts_extension.refund_update_at': moment(req.body.refundStatusUpdateAt)
                    .toDate()
            }
            : undefined));
        // 集計タスク作成
        const taskRepo = new ttts.repository.Task(mongoose.connection);
        const aggregateTask = {
            name: ttts.factory.taskName.AggregateEventReservations,
            project: req.project,
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
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
