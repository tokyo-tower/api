"use strict";
const express = require("express");
let router = express.Router();
const passport = require("passport");
const AuthController_1 = require("../controllers/Auth/AuthController");
const PerformanceController_1 = require("../controllers/Performance/PerformanceController");
const ReservationController_1 = require("../controllers/Reservation/ReservationController");
const ScreenController_1 = require("../controllers/Screen/ScreenController");
const OtherController_1 = require("../controllers/Other/OtherController");
router.get('/:locale/performance/search', (req, res, next) => { (new PerformanceController_1.default(req, res, next)).search(); });
router.post('/:locale/reservation/email', (req, res, next) => { (new ReservationController_1.default(req, res, next)).email(); });
router.get('/screen/:id/show', (req, res, next) => { (new ScreenController_1.default(req, res, next)).show(); });
router.post('/login', (req, res, next) => { (new AuthController_1.default(req, res, next)).login(); });
router.all('/reservations', passport.authenticate('bearer', { session: false }), (req, res, next) => { (new ReservationController_1.default(req, res, next)).findByMvtkUser(); });
router.all('/reservation/:id', passport.authenticate('bearer', { session: false }), (req, res, next) => { (new ReservationController_1.default(req, res, next)).findById(); });
router.post('/reservation/:id/enter', (req, res, next) => { (new ReservationController_1.default(req, res, next)).enter(); });
router.get('/environmentVariables', (req, res, next) => { (new OtherController_1.default(req, res, next)).environmentVariables(); });
router.use((req, res) => {
    res.json({
        success: false,
        message: `router for [${req.originalUrl}] not found.`
    });
});
router.use((err, req, res, next) => {
    console.error(req.originalUrl, req.query, req.params, req.body, err);
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
