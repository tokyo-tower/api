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
const utilsRouter = express_1.Router();
const debug = createDebug('ttts-api:routes:utils');
// api・予約通過確認
// tslint:disable-next-line:max-func-body-length
utilsRouter.get('/pass/list', (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        // 取得対象のパフォーマンス取得
        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);
        const performances = yield performanceRepo.performanceModel.find({
            day: req.query.day
        })
            .populate('film screen theater')
            .populate({ path: 'ticket_type_group', populate: { path: 'ticket_types' } })
            .exec().then((docs) => docs.map((doc) => doc.toObject()));
        debug('performances found,', performances.length);
        // 予約情報取得
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const reservations = yield reservationRepo.reservationModel.find({
            performance: { $in: performances.map((p) => p.id) },
            status: ttts.factory.reservationStatusType.ReservationConfirmed
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));
        debug('reservations found,', reservations.length);
        // チェックポイント名称取得
        const ownerRepo = new ttts.repository.Owner(ttts.mongoose.connection);
        const owners = yield ownerRepo.ownerModel.find({ notes: '1' }).exec();
        // レスポンス編集
        const data = {
            checkpoints: owners.map((owner) => {
                return {
                    where: owner.get('group'),
                    description: owner.get('description')
                };
            }),
            schedules: []
        };
        // パフォーマンスごとに集計
        performances.forEach((performance) => {
            const reservations4performance = reservations.filter((r) => r.performance === performance.id);
            debug('creating schedule...');
            // 全予約数
            const reservedNum = reservations4performance.filter((r) => (r.status === ttts.factory.reservationStatusType.ReservationConfirmed)).length;
            // 場所ごとの入場情報を集計
            const checkinInfosByWhere = data.checkpoints.map((checkpoint) => {
                return {
                    where: checkpoint.where,
                    checkins: [],
                    arrivedCountsByTicketType: performance.ticket_type_group.ticket_types.map((t) => {
                        return { ticketType: t.id, ticketCategory: t.ttts_extension.category, count: 0 };
                    })
                };
            });
            reservations4performance.forEach((reservation) => {
                const tempCheckinWhereArray = [];
                reservation.checkins.forEach((checkin) => {
                    // 同一ポイントでの重複チェックインを除外
                    // ※チェックポイントに現れた物理的な人数を数えるのが目的なのでチェックイン行為の重複はここでは問題にしない
                    if (tempCheckinWhereArray.indexOf(checkin.where) >= 0) {
                        return;
                    }
                    tempCheckinWhereArray.push(checkin.where);
                    const checkinInfoByWhere = checkinInfosByWhere.find((info) => info.where === checkin.where);
                    // チェックイン数セット
                    checkinInfoByWhere.arrivedCountsByTicketType.find((c) => c.ticketType === reservation.ticket_type).count += 1;
                    // チェックイン数セット
                    checkinInfoByWhere.checkins.push(Object.assign({}, checkin, {
                        ticketType: reservation.ticket_type,
                        ticketCategory: reservation.ticket_ttts_extension.category
                    }));
                });
            });
            // 券種ごとの予約数を集計
            const reservationCountsByTicketType = performance.ticket_type_group.ticket_types.map((t) => {
                return { ticketType: t.id, count: 0 };
            });
            reservations4performance.map((reservation) => {
                // 券種ごとの予約数をセット
                reservationCountsByTicketType.find((c) => c.ticketType === reservation.ticket_type).count += 1;
            });
            const schedule = {
                performanceId: performance.id,
                start_time: performance.start_time,
                end_time: performance.end_time,
                totalReservedNum: reservedNum,
                reservationCountsByTicketType: reservationCountsByTicketType,
                // 場所ごとに、券種ごとの入場者数初期値をセット
                checkinCountsByWhere: data.checkpoints.map((checkpoint) => {
                    return {
                        where: checkpoint.where,
                        checkinCountsByTicketType: performance.ticket_type_group.ticket_types.map((t) => {
                            return {
                                ticketType: t.id,
                                ticketCategory: t.ttts_extension.category,
                                count: 0
                            };
                        })
                    };
                })
            };
            // 場所ごとに、券種ごとの未入場者数を算出する
            checkinInfosByWhere.forEach((checkinInfoByWhere) => {
                const checkinCountsByTicketType = schedule.checkinCountsByWhere.find((c) => c.where === checkinInfoByWhere.where);
                checkinInfoByWhere.checkins.forEach((checkin) => {
                    checkinCountsByTicketType.checkinCountsByTicketType.find((c) => c.ticketType === checkin.ticketType).count += 1;
                });
            });
            data.schedules.push(schedule);
        });
        res.json(data);
    }
    catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable('予約通過確認情報取得失敗'));
    }
}));
exports.default = utilsRouter;
