"use strict";
/**
 * パフォーマンスルーター
 * @module routes/performances
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const express = require("express");
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
        const conditions = {
            // tslint:disable-next-line:no-magic-numbers
            limit: (!_.isEmpty(req.query.limit)) ? parseInt(req.query.limit, 10) : undefined,
            // tslint:disable-next-line:no-magic-numbers
            page: (!_.isEmpty(req.query.page)) ? parseInt(req.query.page, 10) : undefined,
            day: (!_.isEmpty(req.query.day)) ? req.query.day : undefined,
            section: (!_.isEmpty(req.query.section)) ? req.query.section : undefined,
            words: (!_.isEmpty(req.query.words)) ? req.query.words : undefined,
            startFrom: (!_.isEmpty(req.query.start_from)) ? moment(req.query.start_from).toDate() : undefined,
            startThrough: (!_.isEmpty(req.query.start_through)) ? moment(req.query.start_through).toDate() : undefined,
            theater: (!_.isEmpty(req.query.theater)) ? req.query.theater : undefined,
            screen: (!_.isEmpty(req.query.screen)) ? req.query.screen : undefined,
            performanceId: (!_.isEmpty(req.query.performanceId)) ? req.query.performanceId : undefined,
            wheelchair: (!_.isEmpty(req.query.screen)) ? req.query.wheelchair : undefined
        };
        yield ttts.service.performance.search(conditions)(new ttts.repository.Performance(ttts.mongoose.connection), new ttts.repository.itemAvailability.Performance(redisClient), new ttts.repository.itemAvailability.SeatReservationOffer(redisClient)).then((searchPerformanceResult) => {
            res.json({
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
exports.default = performanceRouter;
