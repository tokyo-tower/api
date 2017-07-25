"use strict";
/**
 * 座席予約コントローラー
 *
 * @namespace controllers/reservation
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
const monapt = require("monapt");
const debug = createDebug('ttts-api:controllers:reservation');
/**
 * 予約情報を取得する
 *
 * @param {string} reservationId 予約ID
 * @return {Promise<monapt.Option<ttts.mongoose.Document>>} 予約ドキュメント
 * @memberof controllers/reservation
 */
function findById(reservationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const reservation = yield ttts.Models.Reservation.findOne({
            _id: reservationId,
            status: ttts.ReservationUtil.STATUS_RESERVED
        }).exec();
        return (reservation === null) ? monapt.None : monapt.Option(reservation);
    });
}
exports.findById = findById;
/**
 * 入場履歴を追加する
 *
 * @param {string} reservationId 予約ID
 * @param {ICheckin} checkin チェックインオブジェクト
 * @return {Promise<monapt.Option<string>>} 入場履歴の追加された予約ID
 * @memberof controllers/reservation
 */
function createCheckin(reservationId, checkin) {
    return __awaiter(this, void 0, void 0, function* () {
        const reservation = yield ttts.Models.Reservation.findByIdAndUpdate(reservationId, {
            $push: {
                checkins: checkin
            }
        }).exec();
        return (reservation === null) ? monapt.None : monapt.Option(reservation.get('id').toString());
    });
}
exports.createCheckin = createCheckin;
/**
 * 予約キャンセル
 *
 * @param {string} performanceDay 上映日
 * @param {string} paymentNo 購入番号
 * @return {Promise<string[]>} キャンセルされた予約ID
 * @memberof controllers/reservation
 */
function cancel(performanceDay, paymentNo) {
    return __awaiter(this, void 0, void 0, function* () {
        // 該当予約を検索
        const reservationIds = yield ttts.Models.Reservation.distinct('_id', {
            performance_day: performanceDay,
            payment_no: paymentNo,
            status: ttts.ReservationUtil.STATUS_RESERVED
        }).exec().then((ids) => ids.map((id) => id.toString()));
        debug('canceling reservations...', performanceDay, paymentNo, reservationIds);
        return yield Promise.all(reservationIds.map((id) => __awaiter(this, void 0, void 0, function* () {
            const canceledReservation = yield ttts.Models.Reservation.findByIdAndUpdate(id, {
                $set: { status: ttts.ReservationUtil.STATUS_AVAILABLE },
                $unset: { payment_no: 1, ticket_type: 1, expired_at: 1 }
            }).exec();
            return canceledReservation.get('id');
        })));
    });
}
exports.cancel = cancel;
