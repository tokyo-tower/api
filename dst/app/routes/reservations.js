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
const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
reservationsRouter.use(authentication_1.default);
/**
 * 予約を検索
 */
reservationsRouter.get('/pagination', permitScopes_1.default(['reservations.read-only']), validator_1.default, 
//tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const POS_CLIENT_ID = process.env.POS_CLIENT_ID;
        // バリデーション
        const errors = {};
        // 片方入力エラーチェック
        if (!isInputEven(req.query.start_hour1, req.query.start_minute1)) {
            errors.start_hour1 = { msg: '時分Fromが片方しか指定されていません' };
        }
        if (!isInputEven(req.query.start_hour2, req.query.start_minute2)) {
            errors.start_hour2 = { msg: '時分Toが片方しか指定されていません' };
        }
        if (Object.keys(errors).length > 0) {
            res.json({
                success: false,
                results: null,
                count: 0,
                errors: errors
            });
            return;
        }
        // tslint:disable-next-line:no-magic-numbers
        const limit = (!_.isEmpty(req.query.limit)) ? parseInt(req.query.limit, 10) : 10;
        // tslint:disable-next-line:no-magic-numbers
        const page = (!_.isEmpty(req.query.page)) ? parseInt(req.query.page, 10) : 1;
        // ご来塔日時
        const day = (!_.isEmpty(req.query.day)) ? req.query.day : null;
        const startHour1 = (!_.isEmpty(req.query.start_hour1)) ? req.query.start_hour1 : null;
        const startMinute1 = (!_.isEmpty(req.query.start_minute1)) ? req.query.start_minute1 : null;
        const startHour2 = (!_.isEmpty(req.query.start_hour2)) ? req.query.start_hour2 : null;
        const startMinute2 = (!_.isEmpty(req.query.start_minute2)) ? req.query.start_minute2 : null;
        // 購入番号
        let paymentNo = (!_.isEmpty(req.query.payment_no)) ? req.query.payment_no : null;
        // アカウント
        const owner = (!_.isEmpty(req.query.owner)) ? req.query.owner : null;
        // 予約方法
        const purchaserGroup = (!_.isEmpty(req.query.purchaser_group)) ? req.query.purchaser_group : null;
        // 決済手段
        const paymentMethod = (!_.isEmpty(req.query.payment_method)) ? req.query.payment_method : null;
        // 名前
        const purchaserLastName = (!_.isEmpty(req.query.purchaser_last_name)) ? req.query.purchaser_last_name : null;
        const purchaserFirstName = (!_.isEmpty(req.query.purchaser_first_name)) ? req.query.purchaser_first_name : null;
        // メアド
        const purchaserEmail = (!_.isEmpty(req.query.purchaser_email)) ? req.query.purchaser_email : null;
        // 電話番号
        const purchaserTel = (!_.isEmpty(req.query.purchaser_tel)) ? req.query.purchaser_tel : null;
        // メモ
        const watcherName = (!_.isEmpty(req.query.watcher_name)) ? req.query.watcher_name : null;
        // 検索条件を作成
        const conditions = [];
        // 管理者の場合、内部関係者の予約全て&確保中
        conditions.push({
            status: ttts.factory.reservationStatusType.ReservationConfirmed
        });
        // 来塔日
        if (day !== null) {
            conditions.push({ performance_day: day });
        }
        // 開始時間
        const startTimeFrom = (startHour1 !== null && startMinute1 !== null) ? startHour1 + startMinute1 : null;
        const startTimeTo = (startHour2 !== null && startMinute2 !== null) ? startHour2 + startMinute2 : null;
        if (startTimeFrom !== null || startTimeTo !== null) {
            const conditionsTime = {};
            // 開始時間From
            if (startTimeFrom !== null) {
                conditionsTime.$gte = startTimeFrom;
            }
            // 開始時間To
            if (startTimeTo !== null) {
                conditionsTime.$lte = startTimeTo;
            }
            conditions.push({ performance_start_time: conditionsTime });
        }
        // 購入番号
        if (paymentNo !== null) {
            // remove space characters
            paymentNo = ttts.CommonUtil.toHalfWidth(paymentNo.replace(/\s/g, ''));
            conditions.push({ payment_no: { $regex: `${paymentNo}` } });
        }
        // アカウント
        if (owner !== null) {
            conditions.push({ owner_username: owner });
        }
        // 予約方法
        if (purchaserGroup !== null) {
            switch (purchaserGroup) {
                case 'POS':
                    // 取引エージェントがPOS
                    conditions.push({ 'transaction_agent.id': POS_CLIENT_ID });
                    break;
                case ttts.factory.person.Group.Customer:
                    // 購入者区分が一般、かつ、POS購入でない
                    conditions.push({ purchaser_group: purchaserGroup });
                    conditions.push({ 'transaction_agent.id': { $ne: POS_CLIENT_ID } });
                    break;
                default:
                    conditions.push({ purchaser_group: purchaserGroup });
            }
        }
        // 決済手段
        if (paymentMethod !== null) {
            conditions.push({ payment_method: paymentMethod });
        }
        // 名前
        if (purchaserLastName !== null) {
            conditions.push({ purchaser_last_name: new RegExp(purchaserLastName, 'i') }); // 大文字小文字区別しない
        }
        if (purchaserFirstName !== null) {
            conditions.push({ purchaser_first_name: new RegExp(purchaserFirstName, 'i') }); // 大文字小文字区別しない
        }
        // メアド
        if (purchaserEmail !== null) {
            conditions.push({ purchaser_email: purchaserEmail });
        }
        // 電話番号
        if (purchaserTel !== null) {
            conditions.push({ purchaser_tel: new RegExp(`${purchaserTel}$`) });
        }
        // メモ
        if (watcherName !== null) {
            conditions.push({ watcher_name: new RegExp(watcherName, 'i') }); // 大文字小文字区別しない
        }
        debug('searching reservations...', conditions);
        try {
            // 総数検索
            const count = yield reservationRepo.reservationModel.count({
                $and: conditions
            }).exec();
            debug('reservation count:', count);
            // データ検索(検索→ソート→指定ページ分切取り)
            const reservations = yield reservationRepo.reservationModel.find({ $and: conditions })
                .sort({
                performance_day: 1,
                performance_start_time: 1,
                payment_no: 1,
                ticket_type: 1
            })
                .skip(limit * (page - 1))
                .limit(limit)
                .exec()
                .then((docs) => docs.map((doc) => doc.toObject()));
            res.json({
                results: reservations,
                count: count,
                errors: null,
                message: ''
            });
        }
        catch (error) {
            res.status(http_status_1.INTERNAL_SERVER_ERROR).json({
                errors: [{
                        message: error.message
                    }]
            });
        }
    }
    catch (error) {
        next(error);
    }
}));
/**
 * IDで予約取得
 */
reservationsRouter.get('/:id', permitScopes_1.default(['reservations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 予約を検索
        debug('searching reservation by id...', req.params.id);
        const reservation = yield reservationRepo.reservationModel.findById(req.params.id)
            .exec().then((doc) => {
            if (doc === null) {
                throw new ttts.factory.errors.NotFound('reservations');
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
            conditions.push({ performance_start_date: { $gte: moment(req.query.performanceStartFrom).toDate() } });
        }
        if (!_.isEmpty(req.query.performanceStartThrough)) {
            conditions.push({ performance_start_date: { $lte: moment(req.query.performanceStartThrough).toDate() } });
        }
        if (!_.isEmpty(req.query.performanceEndFrom)) {
            conditions.push({ performance_end_date: { $gte: moment(req.query.performanceEndFrom).toDate() } });
        }
        if (!_.isEmpty(req.query.performanceEndThrough)) {
            conditions.push({ performance_end_date: { $lte: moment(req.query.performanceEndThrough).toDate() } });
        }
        // 予約を検索
        debug('searching reservations...', conditions);
        const reservations = yield reservationRepo.reservationModel.find({ $and: conditions })
            .exec().then((docs) => docs.map((doc) => doc.toObject()));
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
/**
 * 両方入力チェック(両方入力、または両方未入力の時true)
 *
 * @param {string} value1
 * @param {string} value2
 * @return {boolean}
 */
function isInputEven(value1, value2) {
    if (_.isEmpty(value1) && _.isEmpty(value2)) {
        return true;
    }
    if (!_.isEmpty(value1) && !_.isEmpty(value2)) {
        return true;
    }
    return false;
}
