"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 購入番号ルーター
 */
const ttts = require("@tokyotower/domain");
const express = require("express");
// tslint:disable-next-line:no-submodule-imports
const check_1 = require("express-validator/check");
const moment = require("moment-timezone");
const mongoose = require("mongoose");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const paymentNosRouter = express.Router();
const redisClient = ttts.redis.createClient({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_KEY,
    tls: { servername: process.env.REDIS_HOST }
});
paymentNosRouter.use(authentication_1.default);
/**
 * イベント指定で購入番号を発行する
 */
paymentNosRouter.post('/publish', permitScopes_1.default(['admin', 'pos', 'transactions']), ...[
    check_1.body('event.id')
        .not()
        .isEmpty()
        .withMessage(() => 'required')
        .isString()
], validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const performanceRepo = new ttts.repository.Performance(mongoose.connection);
        const paymentNoRepo = new ttts.repository.PaymentNo(redisClient);
        const event = yield performanceRepo.findById(req.body.event.id);
        const eventStartDateStr = moment(event.startDate)
            .tz('Asia/Tokyo')
            .format('YYYYMMDD');
        const paymentNo = yield paymentNoRepo.publish(eventStartDateStr);
        res.json({ paymentNo });
    }
    catch (error) {
        next(error);
    }
}));
exports.default = paymentNosRouter;
