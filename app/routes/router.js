"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const router = express.Router();
// import * as passport from 'passport';
const setLocale_1 = require("../middlewares/setLocale");
// import * as AuthController from '../controllers/auth';
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
// router.post('/login', setLocale, AuthController.login);
// 要認証サービス
// router.all('/reservations', passport.authenticate('bearer', { session: false }), setLocale, ReservationController.findByMvtkUser);
// router.all('/reservation/:id', passport.authenticate('bearer', { session: false }), setLocale, ReservationController.findById);
// 入場
router.post('/reservation/:id/checkin', setLocale_1.default, ReservationController.checkin);
exports.default = router;
