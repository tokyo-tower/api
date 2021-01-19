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
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const permitScopes_1 = require("../middlewares/permitScopes");
const performanceRouter = express.Router();
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
