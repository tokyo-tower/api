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
const http_status_1 = require("http-status");
const moment = require("moment");
const _ = require("underscore");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
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
        res.json(performance);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * パフォーマンス検索
 */
performanceRouter.get('', permitScopes_1.default(['performances', 'performances.read-only']), (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const conditions = Object.assign({}, req.query, { limit: (!_.isEmpty(req.query.limit)) ? Number(req.query.limit) : undefined, page: (!_.isEmpty(req.query.page)) ? Number(req.query.page) : undefined, startFrom: (!_.isEmpty(req.query.start_from)) ? moment(req.query.start_from)
                .toDate() : undefined, startThrough: (!_.isEmpty(req.query.start_through)) ? moment(req.query.start_through)
                .toDate() : undefined, ttts_extension: Object.assign({}, req.query.ttts_extension, { online_sales_update_at: (req.query.ttts_extension !== undefined && req.query.ttts_extension.online_sales_update_at !== undefined)
                    ? {
                        $gte: moment(req.query.ttts_extension.online_sales_update_at.$gte)
                            .toDate(),
                        $lt: moment(req.query.ttts_extension.online_sales_update_at.$lt)
                            .toDate()
                    }
                    : undefined }) });
        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        yield ttts.service.performance.search(conditions)(performanceRepo, new ttts.repository.itemAvailability.Performance(redisClient), new ttts.repository.itemAvailability.SeatReservationOffer(redisClient))
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
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = performanceRouter;
