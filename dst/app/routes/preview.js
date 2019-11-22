"use strict";
/**
 * previewルーター
 * @ignore
 */
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
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
const moment = require("moment");
const previewRouter = express_1.Router();
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
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
        const checkinGateRepo = new ttts.repository.place.CheckinGate(redisClient);
        const checkinGates = yield checkinGateRepo.findAll();
        res.json(checkinGates);
    }
    catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable(error.message));
    }
}));
exports.default = previewRouter;
