"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onActionStatusChanged = exports.onOrderReturned = void 0;
const cinerinoapi = require("@cinerino/sdk");
const ttts = require("@tokyotower/domain");
const moment = require("moment-timezone");
/**
 * 注文返品時の情報連携
 */
function onOrderReturned(params) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const order = params;
        const event = order.acceptedOffers[0].itemOffered.reservationFor;
        // 販売者都合の手数料なし返品であれば、情報連携
        let cancellationFee = 0;
        if (order.returner !== undefined && order.returner !== null) {
            const returner = order.returner;
            if (Array.isArray(returner.identifier)) {
                const cancellationFeeProperty = returner.identifier.find((p) => p.name === 'cancellationFee');
                if (cancellationFeeProperty !== undefined) {
                    cancellationFee = Number(cancellationFeeProperty.value);
                }
            }
        }
        let reason = cinerinoapi.factory.transaction.returnOrder.Reason.Customer;
        if (order.returner !== undefined && order.returner !== null) {
            const returner = order.returner;
            if (Array.isArray(returner.identifier)) {
                const reasonProperty = returner.identifier.find((p) => p.name === 'reason');
                if (reasonProperty !== undefined) {
                    reason = reasonProperty.value;
                }
            }
        }
        if (reason === cinerinoapi.factory.transaction.returnOrder.Reason.Seller && cancellationFee === 0) {
            // パフォーマンスに返品済数を連携
            yield repos.performance.updateOne({ _id: event.id }, {
                $inc: {
                    'ttts_extension.refunded_count': 1,
                    'ttts_extension.unrefunded_count': -1
                },
                'ttts_extension.refund_update_at': new Date()
            });
            // すべて返金完了したら、返金ステータス変更
            yield repos.performance.updateOne({
                _id: event.id,
                'ttts_extension.unrefunded_count': 0
            }, {
                'ttts_extension.refund_status': ttts.factory.performance.RefundStatus.Compeleted,
                'ttts_extension.refund_update_at': new Date()
            });
        }
    });
}
exports.onOrderReturned = onOrderReturned;
/**
 * 予約使用アクション変更イベント処理
 */
function onActionStatusChanged(params) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const action = params;
        if (action.typeOf === ttts.factory.chevre.actionType.UseAction) {
            const actionObject = action.object;
            if (Array.isArray(actionObject)) {
                const reservations = actionObject;
                const checkedin = action.actionStatus === ttts.factory.chevre.actionStatusType.CompletedActionStatus;
                const checkinDate = checkedin
                    ? moment(action.startDate)
                        .tz('Asia/Tokyo')
                        .format('YYYY/MM/DD HH:mm:ss')
                    : '';
                yield Promise.all(reservations.map((reservation) => __awaiter(this, void 0, void 0, function* () {
                    if (reservation.typeOf === ttts.factory.chevre.reservationType.EventReservation
                        && typeof reservation.id === 'string'
                        && reservation.id.length > 0) {
                        // レポートに反映
                        yield repos.report.updateAttendStatus({
                            reservation: { id: reservation.id },
                            checkedin: checkedin ? 'TRUE' : 'FALSE',
                            checkinDate: checkinDate
                        });
                    }
                })));
            }
        }
    });
}
exports.onActionStatusChanged = onActionStatusChanged;
