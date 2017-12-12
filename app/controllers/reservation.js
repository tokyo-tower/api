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
const debug = createDebug('ttts-api:controllers:reservation');
/**
 * 予約情報を取得する
 * @param {string} reservationId 予約ID
 * @return {Promise<ttts.mongoose.Document | null>} 予約ドキュメント
 * @memberof controllers/reservation
 */
function findById(reservationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const reservation = yield reservationRepo.reservationModel.findOne({
            _id: reservationId,
            status: ttts.factory.reservationStatusType.ReservationConfirmed
        }).exec();
        return (reservation === null) ? null : reservation;
    });
}
exports.findById = findById;
/**
 * 入場履歴を追加する
 * @param {string} reservationId 予約ID
 * @param {ICheckin} checkin チェックインオブジェクト
 * @return {Promise<string | null>} 入場履歴の追加された予約ID
 * @memberof controllers/reservation
 */
function createCheckin(reservationId, checkin) {
    return __awaiter(this, void 0, void 0, function* () {
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const reservation = yield reservationRepo.reservationModel.findByIdAndUpdate(reservationId, {
            $push: {
                checkins: checkin
            }
        }).exec();
        return (reservation === null) ? null : reservation.get('id').toString();
    });
}
exports.createCheckin = createCheckin;
/**
 * 予約キャンセル
 * @param {string} performanceDay 上映日
 * @param {string} paymentNo 購入番号
 * @return {Promise<string[]>} キャンセルされた予約ID
 * @memberof controllers/reservation
 */
function cancel(performanceDay, paymentNo) {
    return __awaiter(this, void 0, void 0, function* () {
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        // 該当予約を検索
        const reservationIds = yield reservationRepo.reservationModel.distinct('_id', {
            performance_day: performanceDay,
            payment_no: paymentNo,
            status: ttts.factory.reservationStatusType.ReservationConfirmed
        }).exec().then((ids) => ids.map((id) => id.toString()));
        debug('canceling reservations...', performanceDay, paymentNo, reservationIds);
        return Promise.all(reservationIds.map((id) => __awaiter(this, void 0, void 0, function* () {
            const canceledReservation = yield reservationRepo.reservationModel.findByIdAndUpdate(id, { status: ttts.factory.reservationStatusType.ReservationCancelled }).exec();
            return canceledReservation.get('id');
        })));
        // tslint:disable-next-line:no-suspicious-comment
        // TODO 在庫を空きに変更
    });
}
exports.cancel = cancel;
