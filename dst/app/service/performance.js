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
exports.performance2result = exports.search = void 0;
/**
 * パフォーマンスルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const USE_NEW_AGGREGATE_ENTRANCE_GATE = process.env.USE_NEW_AGGREGATE_ENTRANCE_GATE === '1';
/**
 * 検索する
 */
function search(searchConditions, useExtension) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const projection = (useExtension)
            ? {
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
                reservationCountsByTicketType: 0
            }
            : {
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
                ttts_extension: 0
            };
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
// tslint:disable-next-line:max-func-body-length
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
    const offers = (_c = performance.aggregateOffer) === null || _c === void 0 ? void 0 : _c.offers;
    let maximumAttendeeCapacity;
    let remainingAttendeeCapacity;
    let remainingAttendeeCapacityForWheelchair;
    let reservationCount;
    let reservationCountsByTicketType;
    const defaultCheckinCountsByTicketType = (Array.isArray(offers))
        ? offers.map((offer) => {
            var _a;
            return {
                ticketType: offer.id,
                ticketCategory: (_a = offer.category) === null || _a === void 0 ? void 0 : _a.codeValue,
                count: 0
            };
        })
        : [];
    let checkinCountsByWhere = [
        {
            where: 'DAITEN_AUTH',
            checkinCountsByTicketType: defaultCheckinCountsByTicketType
        },
        {
            where: 'TOPDECK_AUTH',
            checkinCountsByTicketType: defaultCheckinCountsByTicketType
        }
    ];
    let checkinCount;
    // aggregateOffer,aggregateReservationから算出する
    maximumAttendeeCapacity = (_f = (_e = (_d = performance.aggregateOffer) === null || _d === void 0 ? void 0 : _d.offers) === null || _e === void 0 ? void 0 : _e.find((o) => o.identifier === '001')) === null || _f === void 0 ? void 0 : _f.maximumAttendeeCapacity;
    remainingAttendeeCapacity = (_j = (_h = (_g = performance.aggregateOffer) === null || _g === void 0 ? void 0 : _g.offers) === null || _h === void 0 ? void 0 : _h.find((o) => o.identifier === '001')) === null || _j === void 0 ? void 0 : _j.remainingAttendeeCapacity;
    remainingAttendeeCapacityForWheelchair
        = (_m = (_l = (_k = performance.aggregateOffer) === null || _k === void 0 ? void 0 : _k.offers) === null || _l === void 0 ? void 0 : _l.find((o) => o.identifier === '004')) === null || _m === void 0 ? void 0 : _m.remainingAttendeeCapacity;
    reservationCount = (_o = performance.aggregateReservation) === null || _o === void 0 ? void 0 : _o.reservationCount;
    reservationCountsByTicketType = (_q = (_p = performance.aggregateOffer) === null || _p === void 0 ? void 0 : _p.offers) === null || _q === void 0 ? void 0 : _q.map((offer) => {
        var _a;
        return {
            ticketType: offer.id,
            count: (_a = offer.aggregateReservation) === null || _a === void 0 ? void 0 : _a.reservationCount
        };
    });
    const places = (_r = performance.aggregateEntranceGate) === null || _r === void 0 ? void 0 : _r.places;
    if (Array.isArray(places)) {
        checkinCountsByWhere = places.map((entranceGate) => {
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
        checkinCount = places.reduce((a, b) => {
            var _a;
            let useActionCount = a;
            const offers4b = (_a = b.aggregateOffer) === null || _a === void 0 ? void 0 : _a.offers;
            if (Array.isArray(offers4b)) {
                useActionCount += offers4b.reduce((a2, b2) => {
                    var _a;
                    return a2 + Number((_a = b2.aggregateReservation) === null || _a === void 0 ? void 0 : _a.useActionCount);
                }, 0);
            }
            return useActionCount;
        }, 0);
    }
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, performance), {
        evServiceStatus: evServiceStatus,
        onlineSalesStatus: onlineSalesStatus,
        tourNumber: tourNumber
    }), (typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined), (typeof remainingAttendeeCapacity === 'number') ? { remainingAttendeeCapacity } : undefined), (typeof remainingAttendeeCapacityForWheelchair === 'number') ? { remainingAttendeeCapacityForWheelchair } : undefined), (typeof reservationCount === 'number') ? { reservationCount } : undefined), (Array.isArray(reservationCountsByTicketType)) ? { reservationCountsByTicketType } : undefined), (Array.isArray(checkinCountsByWhere)) ? { checkinCountsByWherePreview: checkinCountsByWhere } : undefined), (typeof checkinCount === 'number') ? { checkinCountPreview: checkinCount } : undefined), (USE_NEW_AGGREGATE_ENTRANCE_GATE) ? { checkinCountsByWhere, checkinCount } : undefined);
}
exports.performance2result = performance2result;
