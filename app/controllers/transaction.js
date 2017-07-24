"use strict";
/**
 * 取引コントローラー
 *
 * @namespace controllers/transaction
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
const moment = require("moment");
const monapt = require("monapt");
const debug = createDebug('ttts-api:controllers:transaction');
/**
 * 仮予約有効期間(分)
 * POSの要件に応じてここを調整してください。
 */
const TEMPORARY_RESERVATION_EXPIRES_IN_MINUTES = 15;
function createAuthorization(performanceId) {
    return __awaiter(this, void 0, void 0, function* () {
        // 座席をひとつ仮予約
        const reservationDoc = yield ttts.Models.Reservation.findOneAndUpdate({
            performance: performanceId,
            status: ttts.ReservationUtil.STATUS_AVAILABLE
        }, {
            status: ttts.ReservationUtil.STATUS_TEMPORARY,
            expired_at: moment().add(TEMPORARY_RESERVATION_EXPIRES_IN_MINUTES, 'minutes').toDate()
        }, {
            new: true
        });
        if (reservationDoc === null) {
            return monapt.None;
        }
        else {
            return monapt.Option({
                type: 'authorizations',
                id: reservationDoc.get('id'),
                attributes: {
                    expires_at: reservationDoc.get('expired_at')
                }
            });
        }
    });
}
exports.createAuthorization = createAuthorization;
function deleteAuthorization(authorizationId) {
    return __awaiter(this, void 0, void 0, function* () {
        debug('deleting authorization...', authorizationId);
        // 座席をひとつ解放する
        const reservationDoc = yield ttts.Models.Reservation.findOneAndUpdate({
            _id: authorizationId,
            status: ttts.ReservationUtil.STATUS_TEMPORARY
        }, {
            $set: { status: ttts.ReservationUtil.STATUS_AVAILABLE },
            $unset: { payment_no: 1, ticket_type: 1, expired_at: 1 }
        }, {
            new: true
        }).exec();
        return (reservationDoc === null) ? monapt.None : monapt.Option(reservationDoc.get('id'));
    });
}
exports.deleteAuthorization = deleteAuthorization;
function confirm() {
    return __awaiter(this, void 0, void 0, function* () {
        debug('confirming transaction...');
    });
}
exports.confirm = confirm;
function cancel() {
    return __awaiter(this, void 0, void 0, function* () {
        debug('canceling reservations...');
    });
}
exports.cancel = cancel;
