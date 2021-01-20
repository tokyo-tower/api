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
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const performanceRouter = express.Router();
/**
 * パフォーマンス検索
 */
performanceRouter.get('', permitScopes_1.default(['transactions']), ...[
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
        // const useExtension = req.query.useExtension === '1';
        // 互換性維持
        if (req.query.day !== undefined) {
            if (typeof req.query.day === 'string' && req.query.day.length > 0) {
                req.query.startFrom = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate();
                req.query.startThrough = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .add(1, 'day')
                    .toDate();
                delete req.query.day;
            }
        }
        const conditions = Object.assign(Object.assign({}, req.query), { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Number(req.query.limit) : 100, page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : 1, sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: 1 } });
        const performanceRepo = new ttts.repository.Performance(mongoose.connection);
        let totalCount;
        if (countDocuments) {
            totalCount = yield performanceRepo.count(conditions);
        }
        // const performances = await search(conditions, useExtension, false)({ performance: performanceRepo });
        const projection = {
            __v: 0,
            created_at: 0,
            updated_at: 0,
            location: 0,
            superEvent: 0,
            offers: 0,
            doorTime: 0,
            duration: 0,
            maximumAttendeeCapacity: 0,
            remainingAttendeeCapacity: 0,
            remainingAttendeeCapacityForWheelchair: 0,
            reservationCount: 0,
            reservationCountsByTicketType: 0,
            aggregateEntranceGate: 0,
            aggregateOffer: 0,
            aggregateReservation: 0,
            checkinCount: 0,
            checkinCountsByWhere: 0
        };
        const performances = yield performanceRepo.search(conditions, projection);
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
performanceRouter.put('/:id/extension', permitScopes_1.default(['admin']), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const performanceRepo = new ttts.repository.Performance(mongoose.connection);
        // イベントが存在しなければ作成する
        const performance = {
            project: { typeOf: ttts.factory.chevre.organizationType.Project, id: (_a = req.project) === null || _a === void 0 ? void 0 : _a.id },
            id: req.params.id,
            eventStatus: ttts.factory.chevre.eventStatusType.EventScheduled,
            startDate: new Date(),
            endDate: new Date(),
            additionalProperty: [],
            ttts_extension: {
                ev_service_update_user: '',
                online_sales_update_user: '',
                refund_status: ttts.factory.performance.RefundStatus.None,
                refund_update_user: '',
                refunded_count: 0
            }
        };
        yield performanceRepo.performanceModel.findByIdAndUpdate(performance.id, { $setOnInsert: performance }, {
            upsert: true,
            new: true
        })
            .exec();
        yield performanceRepo.updateOne({ _id: req.params.id }, Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof req.body.startDate === 'string' && req.body.startDate.length > 0)
            ? {
                startDate: moment(req.body.startDate)
                    .toDate()
            }
            : undefined), (typeof req.body.endDate === 'string' && req.body.endDate.length > 0)
            ? {
                endDate: moment(req.body.endDate)
                    .toDate()
            }
            : undefined), (Array.isArray(req.body.additionalProperty))
            ? { additionalProperty: req.body.additionalProperty }
            : undefined), (Array.isArray(req.body.checkedReservations))
            ? { 'ttts_extension.checkedReservations': req.body.checkedReservations }
            : undefined), (req.body.reservationsAtLastUpdateDate !== undefined)
            ? { 'ttts_extension.reservationsAtLastUpdateDate': req.body.reservationsAtLastUpdateDate }
            : undefined), (req.body.onlineSalesStatusUpdateUser !== undefined)
            ? { 'ttts_extension.online_sales_update_user': req.body.onlineSalesStatusUpdateUser }
            : undefined), (req.body.onlineSalesStatusUpdateAt !== undefined && req.body.onlineSalesStatusUpdateAt !== '')
            ? {
                'ttts_extension.online_sales_update_at': moment(req.body.onlineSalesStatusUpdateAt)
                    .toDate()
            }
            : undefined), (typeof req.body.eventStatus === 'string')
            ? { eventStatus: req.body.eventStatus }
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
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = performanceRouter;
