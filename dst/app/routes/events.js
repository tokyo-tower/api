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
 * イベントルーター
 */
const ttts = require("@tokyotower/domain");
const express = require("express");
const express_validator_1 = require("express-validator");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const rateLimit_1 = require("../middlewares/rateLimit");
const validator_1 = require("../middlewares/validator");
const performance_1 = require("../service/performance");
const eventsRouter = express.Router();
eventsRouter.use(authentication_1.default);
eventsRouter.use(rateLimit_1.default);
/**
 * パフォーマンス検索
 */
eventsRouter.get('', permitScopes_1.default(['transactions']), ...[
    express_validator_1.query('startFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('startThrough')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('endFrom')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('endThrough')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('ttts_extension.online_sales_update_at.$gte')
        .optional()
        .isISO8601()
        .toDate(),
    express_validator_1.query('ttts_extension.online_sales_update_at.$lt')
        .optional()
        .isISO8601()
        .toDate()
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const countDocuments = req.query.countDocuments === '1';
        const useExtension = req.query.useExtension === '1';
        // 互換性維持
        if (req.query.day !== undefined) {
            if (typeof req.query.day === 'string' && req.query.day.length > 0) {
                req.query.startFrom = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate();
                req.query.startThrough = moment(`${req.query.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .add(1, 'day')
                    .toDate();
                delete req.query.day;
            }
        }
        const conditions = Object.assign(Object.assign({}, req.query), { 
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Number(req.query.limit) : 100, page: (req.query.page !== undefined) ? Math.max(Number(req.query.page), 1) : 1, sort: (req.query.sort !== undefined) ? req.query.sort : { startDate: 1 } });
        const performanceRepo = new ttts.repository.Performance(mongoose.connection);
        let totalCount;
        if (countDocuments) {
            totalCount = yield performanceRepo.count(conditions);
        }
        const performances = yield performance_1.search(conditions, useExtension)({ performance: performanceRepo });
        if (typeof totalCount === 'number') {
            res.set('X-Total-Count', totalCount.toString());
        }
        res.json({ data: performances });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = eventsRouter;
