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
exports.onReservationStatusChanged = exports.onOrderReturned = void 0;
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
        // 集計タスク作成
        const aggregateTask = {
            name: ttts.factory.taskName.AggregateEventReservations,
            project: { typeOf: ttts.factory.chevre.organizationType.Project, id: params.project.id },
            status: ttts.factory.taskStatus.Ready,
            // Chevreの在庫解放が非同期で実行されるのでやや時間を置く
            runsAt: moment()
                // tslint:disable-next-line:no-magic-numbers
                .add(10, 'seconds')
                .toDate(),
            remainingNumberOfTries: 3,
            numberOfTried: 0,
            executionResults: [],
            data: { id: reservation.reservationFor.id }
        };
        yield repos.task.save(aggregateTask);
    });
}
exports.onReservationStatusChanged = onReservationStatusChanged;
