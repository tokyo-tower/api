"use strict";
const express = require("express");
let router = express.Router();
const passport = require("passport");
const setLocale_1 = require("../middlewares/setLocale");
const AuthController = require("../controllers/Auth/AuthController");
const PerformanceController = require("../controllers/Performance/PerformanceController");
const ReservationController = require("../controllers/Reservation/ReservationController");
const ScreenController = require("../controllers/Screen/ScreenController");
const OtherController = require("../controllers/Other/OtherController");
router.get('/:locale/performance/search', setLocale_1.default, PerformanceController.search);
router.post('/:locale/reservation/email', setLocale_1.default, ReservationController.email);
router.get('/screen/:id/show', ScreenController.show);
router.post('/login', setLocale_1.default, AuthController.login);
router.all('/reservations', passport.authenticate('bearer', { session: false }), setLocale_1.default, ReservationController.findByMvtkUser);
router.all('/reservation/:id', passport.authenticate('bearer', { session: false }), setLocale_1.default, ReservationController.findById);
router.post('/reservation/:id/enter', setLocale_1.default, ReservationController.enter);
router.get('/environmentVariables', OtherController.environmentVariables);
router.use((req, res) => {
    res.json({
        success: false,
        message: `router for [${req.originalUrl}] not found.`
    });
});
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
