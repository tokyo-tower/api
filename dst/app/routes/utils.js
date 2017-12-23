"use strict";
/**
 * utilsルーター
 * @ignore
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
const express_1 = require("express");
const PerformanceController = require("../controllers/performances");
const utilsRouter = express_1.Router();
const debug = createDebug('ttts-api:routes:utils');
// api・予約通過確認
utilsRouter.get('/performancesWithCountAggregation', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 取得対象のパフォーマンス取得
        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const ownerRepo = new ttts.repository.Owner(ttts.mongoose.connection);
        const performances = yield performanceRepo.performanceModel.find({
            day: req.query.day
        })
            .populate('film screen theater')
            .populate({ path: 'ticket_type_group', populate: { path: 'ticket_types' } })
            .exec().then((docs) => docs.map((doc) => doc.toObject()));
        debug('performances found,', performances.length);
        // 予約情報取得
        const reservations = yield reservationRepo.reservationModel.find({
            performance: { $in: performances.map((p) => p.id) },
            status: ttts.factory.reservationStatusType.ReservationConfirmed
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        debug('reservations found,', reservations.length);
        // チェックポイント名称取得
        const owners = yield ownerRepo.ownerModel.find({ notes: '1' }).exec();
        const checkpoints = owners.map((owner) => {
            return {
                where: owner.get('group'),
                description: owner.get('description')
            };
        });
        const aggregations = [];
        // パフォーマンスごとに集計
        performances.forEach((performance) => __awaiter(this, void 0, void 0, function* () {
            const reservations4performance = reservations.filter((r) => r.performance === performance.id);
            debug('creating schedule...');
            const aggregation = PerformanceController.aggregateCounts(performance, reservations4performance, checkpoints)();
            aggregations.push(aggregation);
        }));
        res.json(aggregations);
    }
    catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable('予約通過確認情報取得失敗'));
    }
}));
exports.default = utilsRouter;
