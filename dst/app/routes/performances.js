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
exports.search = exports.searchByChevre = void 0;
/**
 * パフォーマンスルーター
 */
const cinerinoapi = require("@cinerino/sdk");
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
const USE_NEW_EVENT_SEARCH = process.env.USE_NEW_EVENT_SEARCH === '1';
const setting = {
    offerCodes: [
        '001',
        '002',
        '003',
        '004',
        '005',
        '006'
    ]
};
const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.CINERINO_CLIENT_ID,
    clientSecret: process.env.CINERINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
const eventService = new cinerinoapi.service.Event({
    endpoint: process.env.CINERINO_API_ENDPOINT,
    auth: cinerinoAuthClient
});
function searchByChevre(params) {
    // tslint:disable-next-line:max-func-body-length
    return () => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        // POSへの互換性維持
        if (params.day !== undefined) {
            if (typeof params.day === 'string' && params.day.length > 0) {
                params.startFrom = moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate();
                params.startThrough = moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .add(1, 'day')
                    .toDate();
                delete params.day;
            }
            if (typeof params.day === 'object') {
                // day: { '$gte': '20190603', '$lte': '20190802' } } の場合
                if (params.day.$gte !== undefined) {
                    params.startFrom = moment(`${params.day.$gte}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .toDate();
                }
                if (params.day.$lte !== undefined) {
                    params.startThrough = moment(`${params.day.$lte}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate();
                }
                delete params.day;
            }
        }
        let events;
        // POSへの互換性維持のためperformanceIdを補完
        if (typeof params.performanceId === 'string') {
            const event = yield eventService.findById({ id: params.performanceId });
            events = [event];
        }
        else {
            const searchConditions = Object.assign(Object.assign(Object.assign({}, params), { 
                // tslint:disable-next-line:no-magic-numbers
                limit: (params.limit !== undefined) ? Number(params.limit) : 100, page: (params.page !== undefined) ? Math.max(Number(params.page), 1) : 1, sort: (params.sort !== undefined) ? params.sort : { startDate: 1 }, typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent }), {
                $projection: { aggregateReservation: 0 }
            });
            const searchResult = yield eventService.search(searchConditions);
            events = searchResult.data;
        }
        // 検索結果があれば、ひとつめのイベントのオファーを検索
        if (events.length === 0) {
            return [];
        }
        const firstEvent = events[0];
        const offers = yield eventService.searchTicketOffers({
            event: { id: firstEvent.id },
            seller: {
                typeOf: (_b = (_a = firstEvent.offers) === null || _a === void 0 ? void 0 : _a.seller) === null || _b === void 0 ? void 0 : _b.typeOf,
                id: (_d = (_c = firstEvent.offers) === null || _c === void 0 ? void 0 : _c.seller) === null || _d === void 0 ? void 0 : _d.id
            },
            store: {
                id: process.env.CINERINO_CLIENT_ID
            }
        });
        const unitPriceOffers = offers
            // 指定のオファーコードに限定する
            .filter((o) => setting.offerCodes.includes(o.identifier))
            .map((o) => {
            // tslint:disable-next-line:max-line-length
            const unitPriceSpec = o.priceSpecification.priceComponent.find((p) => p.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification);
            return Object.assign(Object.assign({}, o), { priceSpecification: unitPriceSpec });
        });
        return events
            .map((event) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            // 一般座席の残席数
            const seatStatus = (_c = (_b = (_a = event.aggregateOffer) === null || _a === void 0 ? void 0 : _a.offers) === null || _b === void 0 ? void 0 : _b.find((o) => o.identifier === '001')) === null || _c === void 0 ? void 0 : _c.remainingAttendeeCapacity;
            // 車椅子座席の残席数
            const wheelchairAvailable = (_f = (_e = (_d = event.aggregateOffer) === null || _d === void 0 ? void 0 : _d.offers) === null || _e === void 0 ? void 0 : _e.find((o) => o.identifier === '004')) === null || _f === void 0 ? void 0 : _f.remainingAttendeeCapacity;
            const tourNumber = (_h = (_g = event.additionalProperty) === null || _g === void 0 ? void 0 : _g.find((p) => p.name === 'tourNumber')) === null || _h === void 0 ? void 0 : _h.value;
            return {
                id: event.id,
                attributes: {
                    day: moment(event.startDate)
                        .tz('Asia/Tokyo')
                        .format('YYYYMMDD'),
                    open_time: moment(event.startDate)
                        .tz('Asia/Tokyo')
                        .format('HHmm'),
                    start_time: moment(event.startDate)
                        .tz('Asia/Tokyo')
                        .format('HHmm'),
                    end_time: moment(event.endDate)
                        .tz('Asia/Tokyo')
                        .format('HHmm'),
                    seat_status: (typeof seatStatus === 'number') ? String(seatStatus) : undefined,
                    wheelchair_available: wheelchairAvailable,
                    tour_number: tourNumber,
                    ticket_types: unitPriceOffers.map((unitPriceOffer) => {
                        var _a, _b, _c, _d;
                        const availableNum = (_c = (_b = (_a = event.aggregateOffer) === null || _a === void 0 ? void 0 : _a.offers) === null || _b === void 0 ? void 0 : _b.find((o) => o.id === unitPriceOffer.id)) === null || _c === void 0 ? void 0 : _c.remainingAttendeeCapacity;
                        return {
                            name: unitPriceOffer.name,
                            id: String(unitPriceOffer.identifier),
                            // POSに対するAPI互換性維持のため、charge属性追加
                            charge: (_d = unitPriceOffer.priceSpecification) === null || _d === void 0 ? void 0 : _d.price,
                            available_num: availableNum
                        };
                    }),
                    online_sales_status: (event.eventStatus === cinerinoapi.factory.chevre.eventStatusType.EventScheduled)
                        ? 'Normal'
                        : 'Suspended'
                }
            };
        });
    });
}
exports.searchByChevre = searchByChevre;
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
        seat_status: performance.remainingAttendeeCapacity,
        tour_number: tourNumber,
        wheelchair_available: performance.remainingAttendeeCapacityForWheelchair,
        ticket_types: ticketTypes.map((ticketType) => {
            var _a, _b, _c;
            return {
                name: ticketType.name,
                id: ticketType.identifier,
                // POSに対するAPI互換性維持のため、charge属性追加
                charge: (_a = ticketType.priceSpecification) === null || _a === void 0 ? void 0 : _a.price,
                available_num: (_c = (_b = performance.offers) === null || _b === void 0 ? void 0 : _b.find((o) => o.id === ticketType.id)) === null || _c === void 0 ? void 0 : _c.remainingAttendeeCapacity
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
], validator_1.default, 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countDocuments = req.query.countDocuments === '1';
        let useLegacySearch = req.query.useLegacySearch === '1';
        if (!USE_NEW_EVENT_SEARCH) {
            useLegacySearch = true;
        }
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
            const performances = yield search(conditions)({ performance: performanceRepo });
            if (typeof totalCount === 'number') {
                res.set('X-Total-Count', totalCount.toString());
            }
            res.json({ data: performances });
        }
        else {
            const events = yield searchByChevre(req.query)();
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
