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
const createDebug = require("debug");
const express = require("express");
const http_status_1 = require("http-status");
const moment = require("moment");
const _ = require("underscore");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const debug = createDebug('ttts-api:routes:reservations');
const reservationsRouter = express.Router();
reservationsRouter.use(authentication_1.default);
/**
 * IDで予約取得
 */
reservationsRouter.get('/:id', permitScopes_1.default(['reservations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 予約を検索
        debug('searching reservation by id...', req.params.id);
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const reservation = yield reservationRepo.reservationModel.findById(req.params.id)
            .exec()
            .then((doc) => {
            if (doc === null) {
                throw new ttts.factory.errors.NotFound('Reservation');
            }
            return doc.toObject();
        });
        res.json(reservation);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 予約検索
 */
reservationsRouter.get('', permitScopes_1.default(['reservations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 予約検索条件
        const conditions = [];
        if (!_.isEmpty(req.query.status)) {
            conditions.push({ status: req.query.status });
        }
        if (!_.isEmpty(req.query.performanceId)) {
            conditions.push({ performance: req.query.performanceId });
        }
        if (!_.isEmpty(req.query.performanceStartFrom)) {
            conditions.push({
                performance_start_date: {
                    $gte: moment(req.query.performanceStartFrom)
                        .toDate()
                }
            });
        }
        if (!_.isEmpty(req.query.performanceStartThrough)) {
            conditions.push({
                performance_start_date: {
                    $lte: moment(req.query.performanceStartThrough)
                        .toDate()
                }
            });
        }
        if (!_.isEmpty(req.query.performanceEndFrom)) {
            conditions.push({
                performance_end_date: {
                    $gte: moment(req.query.performanceEndFrom)
                        .toDate()
                }
            });
        }
        if (!_.isEmpty(req.query.performanceEndThrough)) {
            conditions.push({
                performance_end_date: {
                    $lte: moment(req.query.performanceEndThrough)
                        .toDate()
                }
            });
        }
        // 予約を検索
        debug('searching reservations...', conditions);
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const reservations = yield reservationRepo.reservationModel.find({ $and: conditions })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
        res.json(reservations);
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 入場
 */
reservationsRouter.post('/:id/checkins', permitScopes_1.default(['reservations.checkins']), (req, __, next) => {
    req.checkBody('when', 'invalid when')
        .notEmpty()
        .withMessage('when is required')
        .isISO8601();
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);
        const checkin = {
            when: moment(req.body.when)
                .toDate(),
            where: req.body.where,
            why: req.body.why,
            how: req.body.how
        };
        const doc = yield reservationRepo.reservationModel.findByIdAndUpdate(req.params.id, { $push: { checkins: checkin } }, { new: true })
            .exec();
        if (doc === null) {
            throw new ttts.factory.errors.NotFound('Reservation');
        }
        // レポート更新タスク作成
        const taskAttributes = ttts.factory.task.updateOrderReportByReservation.createAttributes({
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            // tslint:disable-next-line:no-null-keyword
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: { reservation: doc.toObject() }
        });
        yield taskRepo.save(taskAttributes);
        res.status(http_status_1.NO_CONTENT)
            .end();
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
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const taskRepo = new ttts.repository.Task(ttts.mongoose.connection);
        const doc = yield reservationRepo.reservationModel.findByIdAndUpdate(req.params.id, { $pull: { checkins: { when: req.params.when } } }, { new: true })
            .exec();
        if (doc === null) {
            throw new ttts.factory.errors.NotFound('Reservation');
        }
        // レポート更新タスク作成
        const taskAttributes = ttts.factory.task.updateOrderReportByReservation.createAttributes({
            status: ttts.factory.taskStatus.Ready,
            runsAt: new Date(),
            remainingNumberOfTries: 3,
            // tslint:disable-next-line:no-null-keyword
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: { reservation: doc.toObject() }
        });
        yield taskRepo.save(taskAttributes);
        res.status(http_status_1.NO_CONTENT)
            .end();
    }
    catch (error) {
        next(error);
    }
}));
exports.default = reservationsRouter;
