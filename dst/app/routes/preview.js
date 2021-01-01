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
 * previewルーター
 */
const cinerinoapi = require("@cinerino/sdk");
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const performance_1 = require("../service/performance");
const USE_NEW_SEARCH_PERFORMANCE_WITH_AGGREGATION = process.env.USE_NEW_SEARCH_PERFORMANCE_WITH_AGGREGATION === '1';
const project = {
    typeOf: cinerinoapi.factory.chevre.organizationType.Project,
    id: process.env.PROJECT_ID
};
const previewRouter = express_1.Router();
const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: process.env.CINERINO_CLIENT_ID,
    clientSecret: process.env.CINERINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});
// 集計データーつきのパフォーマンス検索
previewRouter.get('/performancesWithAggregation', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const conditions = {
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Number(req.query.limit) : 100,
            page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : 1,
            sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: 1 },
            startFrom: (typeof req.query.startFrom === 'string')
                ? moment(req.query.startFrom)
                    .toDate()
                : undefined,
            startThrough: (typeof req.query.startThrough === 'string')
                ? moment(req.query.startThrough)
                    .toDate()
                : undefined
        };
        let searchPerformanceResult;
        if (USE_NEW_SEARCH_PERFORMANCE_WITH_AGGREGATION) {
            // chevreで取得
            const eventService = new cinerinoapi.service.Event({
                auth: cinerinoAuthClient,
                endpoint: process.env.CINERINO_API_ENDPOINT,
                project: { id: project.id }
            });
            const searchEventsResult = yield eventService.search(Object.assign({ typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent, limit: conditions.limit, page: conditions.page, sort: { startDate: 1 }, startFrom: conditions.startFrom, startThrough: conditions.startThrough }, {
                $projection: {
                    checkInCount: 0,
                    maximumAttendeeCapacity: 0,
                    remainingAttendeeCapacity: 0
                }
            }));
            searchPerformanceResult = searchEventsResult.data.map(performance_1.performance2result);
        }
        else {
            const performanceRepo = new ttts.repository.Performance(mongoose.connection);
            searchPerformanceResult = yield performance_1.search(conditions, false)({ performance: performanceRepo });
        }
        res.json(searchPerformanceResult);
    }
    catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable(error.message));
    }
}));
// 入場場所検索
previewRouter.get('/places/checkinGate', (__, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // chevreで取得
        const placeService = new cinerinoapi.service.Place({
            auth: cinerinoAuthClient,
            endpoint: process.env.CINERINO_API_ENDPOINT,
            project: { id: project.id }
        });
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({});
        const movieTheater = searchMovieTheatersResult.data.shift();
        if (movieTheater === undefined) {
            throw new ttts.factory.errors.NotFound('MovieTheater');
        }
        let entranceGates = movieTheater.hasEntranceGate;
        if (!Array.isArray(entranceGates)) {
            entranceGates = [];
        }
        res.json(entranceGates.map((g) => {
            var _a;
            return Object.assign(Object.assign({}, g), { name: (typeof g.name === 'string') ? g.name : String((_a = g.name) === null || _a === void 0 ? void 0 : _a.ja) });
        }));
    }
    catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable(error.message));
    }
}));
exports.default = previewRouter;
