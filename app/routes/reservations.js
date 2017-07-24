"use strict";
/**
 * 予約ルーター
 *
 * @module routes/reservations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const reservationRouter = express.Router();
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const setLocale_1 = require("../middlewares/setLocale");
const validator_1 = require("../middlewares/validator");
const ReservationController = require("../controllers/reservation");
reservationRouter.use(authentication_1.default);
/**
 * 予約メール転送
 */
reservationRouter.post('/:id/transfer', permitScopes_1.default(['reservations', 'reservations.read-only']), setLocale_1.default, (req, __, next) => {
    // メールアドレスの有効性チェック
    req.checkBody('to', 'invalid to')
        .isEmail().withMessage(req.__('Message.invalid{{fieldName}}', { fieldName: req.__('Form.FieldName.email') }));
    next();
}, validator_1.default, ReservationController.transfer);
/**
 * 入場
 */
reservationRouter.post('/:id/checkin', permitScopes_1.default(['reservations', 'reservations.checkins']), setLocale_1.default, (__1, __2, next) => {
    next();
}, validator_1.default, ReservationController.checkin);
exports.default = reservationRouter;
