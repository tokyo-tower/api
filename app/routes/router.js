"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const setLocale_1 = require("../middlewares/setLocale");
const validator_1 = require("../middlewares/validator");
const PerformanceController = require("../controllers/performance");
const ReservationController = require("../controllers/reservation");
const ScreenController = require("../controllers/screen");
router.use(authentication_1.default);
/**
 * URLルーティング
 */
// search performances
router.get('/:locale/performance/search', permitScopes_1.default(['performances', 'performances.read-only']), setLocale_1.default, PerformanceController.search);
// 予約メール転送
router.post('/:locale/reservation/:id/transfer', permitScopes_1.default(['reservations', 'reservations.read-only']), setLocale_1.default, (req, __, next) => {
    // メールアドレスの有効性チェック
    req.checkBody('to', 'invalid to')
        .isEmail().withMessage(req.__('Message.invalid{{fieldName}}', { fieldName: req.__('Form.FieldName.email') }));
    next();
}, validator_1.default, ReservationController.transfer);
// show screen html
router.get('/screen/:id/show', permitScopes_1.default(['screens', 'screens.read-only']), (__1, __2, next) => {
    next();
}, validator_1.default, ScreenController.show);
// 入場
router.post('/reservation/:id/checkin', permitScopes_1.default(['reservations', 'reservations.checkins']), setLocale_1.default, (__1, __2, next) => {
    next();
}, validator_1.default, ReservationController.checkin);
exports.default = router;
