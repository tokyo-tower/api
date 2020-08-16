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
    return Object.assign(Object.assign({}, performance), {
        evServiceStatus: evServiceStatus,
        onlineSalesStatus: onlineSalesStatus,
        tourNumber: tourNumber
    });
}
