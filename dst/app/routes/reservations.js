"use strict";
/**
 * 予約ルーター
 * @namespace routes.reservations
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
const http_status_1 = require("http-status");
const moment = require("moment");
const reservationsRouter = express.Router();
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
reservationsRouter.use(authentication_1.default);
/**
 * 入場
 */
reservationsRouter.post('/:id/checkins', permitScopes_1.default(['reservations.checkins']), (req, _, next) => {
    req.checkBody('when', 'invalid when').notEmpty().withMessage('when is required').isISO8601();
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const checkin = {
            when: moment(req.body.when).toDate(),
            where: req.body.where,
            why: req.body.why,
            how: req.body.how
        };
        const reservation = yield reservationRepo.reservationModel.findByIdAndUpdate(req.params.id, {
            $push: { checkins: checkin }
        }).exec();
        if (reservation === null) {
            throw new ttts.factory.errors.NotFound('reservations');
        }
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 入場取消
 * 入場日時がid
 */
reservationsRouter.delete('/:id/checkins/:when', permitScopes_1.default(['reservations.checkins']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const reservation = yield reservationRepo.reservationModel.findByIdAndUpdate(req.params.id, {
            $pull: { checkins: { when: req.params.when } }
        }, { new: true }).exec();
        if (reservation === null) {
            throw new ttts.factory.errors.NotFound('reservations');
        }
        res.status(http_status_1.NO_CONTENT).end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = reservationsRouter;
