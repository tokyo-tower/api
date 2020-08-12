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
const moment = require("moment-timezone");
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
    return () => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        let events;
        // performanceId指定の場合はこちら
        if (typeof params.performanceId === 'string') {
            const event = yield eventService.findById({ id: params.performanceId });
            events = [event];
        }
        else {
            const searchConditions = Object.assign(Object.assign({ 
                // tslint:disable-next-line:no-magic-numbers
                limit: (params.limit !== undefined) ? Number(params.limit) : 100, page: (params.page !== undefined) ? Math.max(Number(params.page), 1) : 1, sort: { startDate: 1 }, typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent }, (typeof params.day === 'string' && params.day.length > 0)
                ? {
                    startFrom: moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .toDate(),
                    startThrough: moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                        .add(1, 'day')
                        .toDate()
                }
                : undefined), {
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
            return event2performance4pos({ event, unitPriceOffers });
        });
    });
}
exports.searchByChevre = searchByChevre;
function event2performance4pos(params) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const event = params.event;
    const unitPriceOffers = params.unitPriceOffers;
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
                ? ttts.factory.performance.OnlineSalesStatus.Normal
                : ttts.factory.performance.OnlineSalesStatus.Suspended
        }
    };
}
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
                superEvent: 0
            }
            : {
                __v: 0,
                created_at: 0,
                updated_at: 0,
                location: 0,
                superEvent: 0,
                ttts_extension: 0
            };
        const performances = yield repos.performance.search(searchConditions, projection);
        return performances.map(performance2result);
    });
}
exports.search = search;
function performance2result(performance) {
    var _a, _b;
    const tourNumber = (_b = (_a = performance.additionalProperty) === null || _a === void 0 ? void 0 : _a.find((p) => p.name === 'tourNumber')) === null || _b === void 0 ? void 0 : _b.value;
    let evServiceStatus = ttts.factory.performance.EvServiceStatus.Normal;
    let onlineSalesStatus = ttts.factory.performance.OnlineSalesStatus.Normal;
    switch (performance.eventStatus) {
        case cinerinoapi.factory.chevre.eventStatusType.EventCancelled:
            evServiceStatus = ttts.factory.performance.EvServiceStatus.Suspended;
            onlineSalesStatus = ttts.factory.performance.OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventPostponed:
            evServiceStatus = ttts.factory.performance.EvServiceStatus.Slowdown;
            onlineSalesStatus = ttts.factory.performance.OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventScheduled:
            break;
        default:
    }
    return Object.assign(Object.assign(Object.assign({}, performance), (performance.ttts_extension !== undefined)
        ? { extension: performance.ttts_extension }
        : undefined), {
        evServiceStatus: evServiceStatus,
        onlineSalesStatus: onlineSalesStatus,
        tourNumber: tourNumber
    });
}
