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
 * タスクルーター
 */
const ttts = require("@tokyotower/domain");
const express_1 = require("express");
// tslint:disable-next-line:no-submodule-imports
const check_1 = require("express-validator/check");
const http_status_1 = require("http-status");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
const WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS = 3600;
const ticketTypeCategoryRateLimitsRouter = express_1.Router();
ticketTypeCategoryRateLimitsRouter.use(authentication_1.default);
/**
 * lock
 */
ticketTypeCategoryRateLimitsRouter.post('/lock', permitScopes_1.default(['admin', 'pos', 'transactions']), ...[
    check_1.body('ticketTypeCategory')
        .not()
        .isEmpty()
        .withMessage(() => 'required'),
    check_1.body('performanceStartDate')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
        .isISO8601()
        .toDate(),
    check_1.body('holder')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
        const rateLimitKey = {
            ticketTypeCategory: req.body.ticketTypeCategory,
            performanceStartDate: req.body.performanceStartDate,
            unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
        };
        yield rateLimitRepo.lock(rateLimitKey, req.body.holder);
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * unlock
 */
ticketTypeCategoryRateLimitsRouter.post('/unlock', permitScopes_1.default(['admin', 'pos', 'transactions']), ...[
    check_1.body('ticketTypeCategory')
        .not()
        .isEmpty()
        .withMessage(() => 'required'),
    check_1.body('performanceStartDate')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
        .isISO8601()
        .toDate(),
    check_1.body('holder')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
], validator_1.default, (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const rateLimitRepo = new ttts.repository.rateLimit.TicketTypeCategory(redisClient);
        const rateLimitKey = {
            ticketTypeCategory: req.body.ticketTypeCategory,
            performanceStartDate: req.body.performanceStartDate,
            unitInSeconds: WHEEL_CHAIR_RATE_LIMIT_UNIT_IN_SECONDS
        };
        const holder = yield rateLimitRepo.getHolder(rateLimitKey);
        if (holder === req.body.holder) {
            yield rateLimitRepo.unlock(rateLimitKey);
        }
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = ticketTypeCategoryRateLimitsRouter;
