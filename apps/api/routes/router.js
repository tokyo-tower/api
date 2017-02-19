"use strict";
const express = require("express");
const router = express.Router();
const passport = require("passport");
const setLocale_1 = require("../middlewares/setLocale");
const AuthController = require("../controllers/Auth/AuthController");
const OtherController = require("../controllers/Other/OtherController");
const PerformanceController = require("../controllers/Performance/PerformanceController");
const ReservationController = require("../controllers/Reservation/ReservationController");
const ScreenController = require("../controllers/Screen/ScreenController");
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
router.use((err, _req, res, next) => {
    if (res.headersSent)
        return next(err);
    res.status(400);
    res.json({
        success: false,
        message: 'Internal Server Error'
    });
});
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = router;
