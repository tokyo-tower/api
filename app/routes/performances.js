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
const express = require("express");
const _ = require("underscore");
const performanceRouter = express.Router();
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const setLocale_1 = require("../middlewares/setLocale");
const PerformanceController = require("../controllers/performance");
const DEFAULT_RADIX = 10;
performanceRouter.use(authentication_1.default);
/**
 * パフォーマンス検索
 */
performanceRouter.get('', permitScopes_1.default(['performances', 'performances.read-only']), setLocale_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const conditions = {
            limit: (!_.isEmpty(req.query.limit)) ? parseInt(req.query.limit, DEFAULT_RADIX) : undefined,
            page: (!_.isEmpty(req.query.page)) ? parseInt(req.query.page, DEFAULT_RADIX) : undefined,
            day: (!_.isEmpty(req.query.day)) ? req.query.day : undefined,
            section: (!_.isEmpty(req.query.section)) ? req.query.section : undefined,
            words: (!_.isEmpty(req.query.words)) ? req.query.words : undefined,
            startFrom: (!_.isEmpty(req.query.start_from)) ? parseInt(req.query.startFrom, DEFAULT_RADIX) : undefined,
            theater: (!_.isEmpty(req.query.theater)) ? req.query.theater : undefined,
            screen: (!_.isEmpty(req.query.screen)) ? req.query.screen : undefined,
            performanceId: (!_.isEmpty(req.query.performanceId)) ? req.query.performanceId : undefined,
            wheelchair: (!_.isEmpty(req.query.screen)) ? req.query.wheelchair : undefined
        };
        yield PerformanceController.search(conditions).then((searchPerformanceResult) => {
            res.json({
                meta: {
                    number_of_performances: searchPerformanceResult.numberOfPerformances,
                    number_of_films: searchPerformanceResult.filmIds.length,
                    sales_suspended: searchPerformanceResult.salesSuspended
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
