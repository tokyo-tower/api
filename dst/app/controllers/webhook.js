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
exports.onActionStatusChanged = exports.onReservationStatusChanged = exports.onOrderReturned = exports.onEventChanged = void 0;
const cinerinoapi = require("@cinerino/sdk");
const ttts = require("@tokyotower/domain");
const moment = require("moment-timezone");
/**
 * イベント変更検知時の処理
 */
function onEventChanged(params) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const event = params;
        // パフォーマンス登録
        const performance = {
            project: params.project,
            id: event.id,
            startDate: moment(event.startDate)
                .toDate(),
            endDate: moment(event.endDate)
                .toDate(),
            eventStatus: event.eventStatus,
            additionalProperty: event.additionalProperty,
            ttts_extension: {
                ev_service_update_user: '',
                online_sales_update_user: '',
                refund_status: ttts.factory.performance.RefundStatus.None,
                refund_update_user: '',
                refunded_count: 0
            }
        };
        yield repos.performance.saveIfNotExists(performance);
    });
}
exports.onEventChanged = onEventChanged;
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
 * 予約取消時処理
 */
function onReservationStatusChanged(params) {
    return (repos) => __awaiter(this, void 0, void 0, function* () {
        const reservation = params;
        switch (reservation.reservationStatus) {
            case cinerinoapi.factory.chevre.reservationStatusType.ReservationCancelled:
                // 東京タワーDB側の予約もステータス変更
                yield repos.reservation.cancel({ id: reservation.id });
                break;
            case cinerinoapi.factory.chevre.reservationStatusType.ReservationConfirmed:
                // 予約データを作成する
                const tttsResevation = Object.assign(Object.assign({}, reservation), { reservationFor: Object.assign(Object.assign({}, reservation.reservationFor), { doorTime: (reservation.reservationFor.doorTime !== undefined)
                            ? moment(reservation.reservationFor.doorTime)
                                .toDate()
                            : undefined, endDate: moment(reservation.reservationFor.endDate)
                            .toDate(), startDate: moment(reservation.reservationFor.startDate)
                            .toDate() }), checkins: [] });
                yield repos.reservation.saveEventReservation(tttsResevation);
                break;
            case cinerinoapi.factory.chevre.reservationStatusType.ReservationHold:
                // 車椅子予約であれば、レート制限
                break;
            case cinerinoapi.factory.chevre.reservationStatusType.ReservationPending:
                break;
            default:
        }
    });
}
exports.onReservationStatusChanged = onReservationStatusChanged;
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
                yield Promise.all(reservations.map((reservation) => __awaiter(this, void 0, void 0, function* () {
                    if (reservation.typeOf === ttts.factory.chevre.reservationType.EventReservation
                        && typeof reservation.id === 'string'
                        && reservation.id.length > 0) {
                        // レポートに反映
                        yield repos.report.updateAttendStatus({
                            reservation: { id: reservation.id },
                            checkedin: checkedin ? 'TRUE' : 'FALSE',
                            checkinDate: checkedin
                                ? moment(action.startDate)
                                    .tz('Asia/Tokyo')
                                    .format('YYYY/MM/DD HH:mm:ss')
                                : ''
                        });
                    }
                })));
            }
        }
    });
}
exports.onActionStatusChanged = onActionStatusChanged;
