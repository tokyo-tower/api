"use strict";
const express = require("express");
const router = express.Router();
const passport = require("passport");
const setLocale_1 = require("../middlewares/setLocale");
const AuthController = require("../controllers/auth");
const OtherController = require("../controllers/other");
const PerformanceController = require("../controllers/performance");
const ReservationController = require("../controllers/reservation");
const ScreenController = require("../controllers/screen");
/**
 * URLルーティング
 */
// search performances
router.get('/:locale/performance/search', setLocale_1.default, PerformanceController.search);
// reservation email
router.post('/:locale/reservation/email', setLocale_1.default, ReservationController.email);
// show screen html
router.get('/screen/:id/show', ScreenController.show);
router.post('/login', setLocale_1.default, AuthController.login);
// 要認証サービス
router.all('/reservations', passport.authenticate('bearer', { session: false }), setLocale_1.default, ReservationController.findByMvtkUser);
router.all('/reservation/:id', passport.authenticate('bearer', { session: false }), setLocale_1.default, ReservationController.findById);
// enter
router.post('/reservation/:id/enter', setLocale_1.default, ReservationController.enter);
// 環境変数
router.get('/environmentVariables', OtherController.environmentVariables);
// 404
router.use((req, res) => {
    res.json({
        success: false,
        message: `router for [${req.originalUrl}] not found.`
    });
});
// error handlers
// tslint:disable-next-line:variable-name
router.use((err, _req, res, next) => {
    if (res.headersSent)
        return next(err);
    const STATUS_CODE_BAD_REQUEST = 400;
    res.status(STATUS_CODE_BAD_REQUEST);
    res.json({
        success: false,
        message: 'Internal Server Error'
    });
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = router;
