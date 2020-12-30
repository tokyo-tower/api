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
const cinerinoapi = require("@cinerino/sdk");
const USE_NEW_PERFORMANCE_AGGREGATION = process.env.USE_NEW_PERFORMANCE_AGGREGATION === '1';
/**
 * 検索する
 */
function search(searchConditions, useExtension) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const projection = (useExtension)
            ? Object.assign({ __v: 0, created_at: 0, updated_at: 0, location: 0, superEvent: 0, offers: 0, doorTime: 0, duration: 0 }, (USE_NEW_PERFORMANCE_AGGREGATION)
                ? {
                    maximumAttendeeCapacity: 0,
                    remainingAttendeeCapacity: 0,
                    remainingAttendeeCapacityForWheelchair: 0,
                    reservationCount: 0,
                    reservationCountsByTicketType: 0
                }
                : undefined) : Object.assign(Object.assign({ __v: 0, created_at: 0, updated_at: 0, location: 0, superEvent: 0, offers: 0, doorTime: 0, duration: 0 }, (USE_NEW_PERFORMANCE_AGGREGATION)
            ? {
                maximumAttendeeCapacity: 0,
                remainingAttendeeCapacity: 0,
                remainingAttendeeCapacityForWheelchair: 0,
                reservationCount: 0,
                reservationCountsByTicketType: 0
            }
            : undefined), { ttts_extension: 0 });
        const performances = yield repos.performance.search(searchConditions, projection);
        return performances.map(performance2result);
    });
}
exports.search = search;
/**
 * エレベータ運行ステータス
 */
var EvServiceStatus;
(function (EvServiceStatus) {
    // 正常運行
    EvServiceStatus["Normal"] = "Normal";
    // 減速
    EvServiceStatus["Slowdown"] = "Slowdown";
    // 停止
    EvServiceStatus["Suspended"] = "Suspended";
})(EvServiceStatus || (EvServiceStatus = {}));
/**
 * オンライン販売ステータス
 */
var OnlineSalesStatus;
(function (OnlineSalesStatus) {
    // 販売
    OnlineSalesStatus["Normal"] = "Normal";
    // 停止
    OnlineSalesStatus["Suspended"] = "Suspended";
})(OnlineSalesStatus || (OnlineSalesStatus = {}));
function performance2result(performance) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const tourNumber = (_b = (_a = performance.additionalProperty) === null || _a === void 0 ? void 0 : _a.find((p) => p.name === 'tourNumber')) === null || _b === void 0 ? void 0 : _b.value;
    let evServiceStatus = EvServiceStatus.Normal;
    let onlineSalesStatus = OnlineSalesStatus.Normal;
    switch (performance.eventStatus) {
        case cinerinoapi.factory.chevre.eventStatusType.EventCancelled:
            evServiceStatus = EvServiceStatus.Suspended;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventPostponed:
            evServiceStatus = EvServiceStatus.Slowdown;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventScheduled:
            break;
        default:
    }
    let maximumAttendeeCapacity;
    let remainingAttendeeCapacity;
    let remainingAttendeeCapacityForWheelchair;
    let reservationCount;
    let reservationCountsByTicketType;
    let checkinCountsByWhere;
    if (USE_NEW_PERFORMANCE_AGGREGATION) {
        // aggregateOffer,aggregateReservationから算出する
        maximumAttendeeCapacity = (_e = (_d = (_c = performance.aggregateOffer) === null || _c === void 0 ? void 0 : _c.offers) === null || _d === void 0 ? void 0 : _d.find((o) => o.identifier === '001')) === null || _e === void 0 ? void 0 : _e.maximumAttendeeCapacity;
        remainingAttendeeCapacity = (_h = (_g = (_f = performance.aggregateOffer) === null || _f === void 0 ? void 0 : _f.offers) === null || _g === void 0 ? void 0 : _g.find((o) => o.identifier === '001')) === null || _h === void 0 ? void 0 : _h.remainingAttendeeCapacity;
        remainingAttendeeCapacityForWheelchair
            = (_l = (_k = (_j = performance.aggregateOffer) === null || _j === void 0 ? void 0 : _j.offers) === null || _k === void 0 ? void 0 : _k.find((o) => o.identifier === '004')) === null || _l === void 0 ? void 0 : _l.remainingAttendeeCapacity;
        reservationCount = (_m = performance.aggregateReservation) === null || _m === void 0 ? void 0 : _m.reservationCount;
        reservationCountsByTicketType = (_p = (_o = performance.aggregateOffer) === null || _o === void 0 ? void 0 : _o.offers) === null || _p === void 0 ? void 0 : _p.map((offer) => {
            var _a;
            return {
                ticketType: offer.id,
                count: (_a = offer.aggregateReservation) === null || _a === void 0 ? void 0 : _a.reservationCount
            };
        });
        checkinCountsByWhere = (_r = (_q = performance.aggregateEntranceGate) === null || _q === void 0 ? void 0 : _q.places) === null || _r === void 0 ? void 0 : _r.map((entranceGate) => {
            var _a, _b;
            return {
                where: entranceGate.identifier,
                checkinCountsByTicketType: (_b = (_a = entranceGate.aggregateOffer) === null || _a === void 0 ? void 0 : _a.offers) === null || _b === void 0 ? void 0 : _b.map((offer) => {
                    var _a, _b;
                    return {
                        ticketType: offer.id,
                        ticketCategory: (_a = offer.category) === null || _a === void 0 ? void 0 : _a.codeValue,
                        count: (_b = offer.aggregateReservation) === null || _b === void 0 ? void 0 : _b.useActionCount
                    };
                })
            };
        });
    }
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, performance), {
        evServiceStatus: evServiceStatus,
        onlineSalesStatus: onlineSalesStatus,
        tourNumber: tourNumber
    }), (typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined), (typeof remainingAttendeeCapacity === 'number') ? { remainingAttendeeCapacity } : undefined), (typeof remainingAttendeeCapacityForWheelchair === 'number') ? { remainingAttendeeCapacityForWheelchair } : undefined), (typeof reservationCount === 'number') ? { reservationCount } : undefined), (Array.isArray(reservationCountsByTicketType)) ? { reservationCountsByTicketType } : undefined), (Array.isArray(checkinCountsByWhere)) ? { checkinCountsByWherePreview: checkinCountsByWhere } : undefined);
}
