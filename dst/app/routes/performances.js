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
exports.search = void 0;
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
/**
 * 検索する
 */
function search(searchConditions) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const performances = yield repos.performance.search(searchConditions);
        return performances.map(performance2result);
    });
}
exports.search = search;
function performance2result(performance) {
    var _a, _b;
    const ticketTypes = (performance.ticket_type_group !== undefined) ? performance.ticket_type_group.ticket_types : [];
    const tourNumber = (_b = (_a = performance.additionalProperty) === null || _a === void 0 ? void 0 : _a.find((p) => p.name === 'tourNumber')) === null || _b === void 0 ? void 0 : _b.value;
    const attributes = {
        day: moment(performance.startDate)
            .tz('Asia/Tokyo')
            .format('YYYYMMDD'),
        open_time: moment(performance.doorTime)
            .tz('Asia/Tokyo')
            .format('HHmm'),
        start_time: moment(performance.startDate)
            .tz('Asia/Tokyo')
            .format('HHmm'),
        end_time: moment(performance.endDate)
            .tz('Asia/Tokyo')
            .format('HHmm'),
        seat_status: (typeof performance.remainingAttendeeCapacity === 'number')
            ? performance.remainingAttendeeCapacity
            : undefined,
        tour_number: tourNumber,
        wheelchair_available: (typeof performance.remainingAttendeeCapacityForWheelchair === 'number')
            ? performance.remainingAttendeeCapacityForWheelchair
            : undefined,
        ticket_types: ticketTypes.map((ticketType) => {
            const offerAggregation = (Array.isArray(performance.offers))
                ? performance.offers.find((o) => o.id === ticketType.id)
                : undefined;
            const unitPriceSpec = ticketType.priceSpecification;
            return {
                name: ticketType.name,
                id: ticketType.identifier,
                // POSに対するAPI互換性維持のため、charge属性追加
                charge: (unitPriceSpec !== undefined) ? unitPriceSpec.price : undefined,
                available_num: (offerAggregation !== undefined) ? offerAggregation.remainingAttendeeCapacity : undefined
            };
        }),
        online_sales_status: (performance.ttts_extension !== undefined)
            ? performance.ttts_extension.online_sales_status : ttts.factory.performance.OnlineSalesStatus.Normal
        // 以下、テストで不要確認したら削除
        // refunded_count: (performance.ttts_extension !== undefined)
        //     ? performance.ttts_extension.refunded_count : undefined,
        // refund_status: (performance.ttts_extension !== undefined)
        //     ? performance.ttts_extension.refund_status : undefined,
        // ev_service_status: (performance.ttts_extension !== undefined)
        //     ? performance.ttts_extension.ev_service_status : undefined
    };
    return Object.assign(Object.assign(Object.assign({}, performance), { evServiceStatus: (performance.ttts_extension !== undefined)
            ? performance.ttts_extension.ev_service_status
            : ttts.factory.performance.EvServiceStatus.Normal, onlineSalesStatus: (performance.ttts_extension !== undefined)
            ? performance.ttts_extension.online_sales_status
            : ttts.factory.performance.OnlineSalesStatus.Normal, extension: performance.ttts_extension }), {
        attributes: attributes,
        tourNumber: tourNumber
    });
}
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
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countDocuments = req.query.countDocuments === '1';
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
        const performances = yield search(conditions)({ performance: performanceRepo });
        if (typeof totalCount === 'number') {
            res.set('X-Total-Count', totalCount.toString());
        }
        res.json({ data: performances });
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
            ? { 'ttts_extension.online_sales_status': req.body.onlineSalesStatus }
            : undefined), (req.body.onlineSalesStatusUpdateUser !== undefined)
            ? { 'ttts_extension.online_sales_update_user': req.body.onlineSalesStatusUpdateUser }
            : undefined), (req.body.onlineSalesStatusUpdateAt !== undefined && req.body.onlineSalesStatusUpdateAt !== '')
            ? {
                'ttts_extension.online_sales_update_at': moment(req.body.onlineSalesStatusUpdateAt)
                    .toDate()
            }
            : undefined), (req.body.evServiceStatus !== undefined)
            ? { 'ttts_extension.ev_service_status': req.body.evServiceStatus }
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
