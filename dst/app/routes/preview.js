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
const moment = require("moment");
const project = {
    typeOf: cinerinoapi.factory.chevre.organizationType.Project,
    id: process.env.PROJECT_ID
};
const previewRouter = express_1.Router();
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
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
        const performanceWithAggregationRepo = new ttts.repository.EventWithAggregation(redisClient);
        let performancesWithAggregation = yield performanceWithAggregationRepo.findAll();
        if (req.query.startFrom !== undefined) {
            const startFrom = moment(req.query.startFrom)
                .unix();
            performancesWithAggregation = performancesWithAggregation.filter((p) => moment(p.startDate)
                .unix() >= startFrom);
        }
        if (req.query.startThrough !== undefined) {
            const startThrough = moment(req.query.startThrough)
                .unix();
            performancesWithAggregation = performancesWithAggregation.filter((p) => moment(p.startDate)
                .unix() <= startThrough);
        }
        res.json(performancesWithAggregation);
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
        // const checkinGateRepo = new ttts.repository.place.CheckinGate(redisClient);
        // const checkinGates = await checkinGateRepo.findAll();
        // res.json(checkinGates);
    }
    catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable(error.message));
    }
}));
exports.default = previewRouter;
