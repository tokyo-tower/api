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
const ttts = require("@tokyotower/domain");
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
                duration: 0
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
                ttts_extension: 0
            };
        const performances = yield repos.performance.search(searchConditions, projection);
        return performances.map(performance2result);
    });
}
exports.search = search;
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
    var _a, _b;
    const tourNumber = (_b = (_a = performance.additionalProperty) === null || _a === void 0 ? void 0 : _a.find((p) => p.name === 'tourNumber')) === null || _b === void 0 ? void 0 : _b.value;
    let evServiceStatus = ttts.factory.performance.EvServiceStatus.Normal;
    let onlineSalesStatus = OnlineSalesStatus.Normal;
    switch (performance.eventStatus) {
        case cinerinoapi.factory.chevre.eventStatusType.EventCancelled:
            evServiceStatus = ttts.factory.performance.EvServiceStatus.Suspended;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventPostponed:
            evServiceStatus = ttts.factory.performance.EvServiceStatus.Slowdown;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventScheduled:
            break;
        default:
    }
    // tslint:disable-next-line:no-suspicious-comment
    // TODO maximumAttendeeCapacity, remainingAttendeeCapacity, remainingAttendeeCapacityForWheelchairをaggregateOfferから算出
    // const aggregateOffer = performance.aggregateOffer;
    // const maximumAttendeeCapacity = aggregateOffer?.offers?.find((o) => o.identifier === '001')?.maximumAttendeeCapacity;
    // const remainingAttendeeCapacity = aggregateOffer?.offers?.find((o) => o.identifier === '001')?.remainingAttendeeCapacity;
    // const remainingAttendeeCapacityForWheelchair =
    //     aggregateOffer?.offers?.find((o) => o.identifier === '004')?.remainingAttendeeCapacity;
    return Object.assign(Object.assign({}, performance), {
        evServiceStatus: evServiceStatus,
        onlineSalesStatus: onlineSalesStatus,
        tourNumber: tourNumber
    }
    // ...(typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined,
    // ...(typeof remainingAttendeeCapacity === 'number') ? { remainingAttendeeCapacity } : undefined,
    // ...(typeof remainingAttendeeCapacityForWheelchair === 'number') ? { remainingAttendeeCapacityForWheelchair } : undefined
    );
}
