import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';
import * as moment from 'moment-timezone';

/**
 * 注文返品時の情報連携
 */
export function onOrderReturned(params: cinerinoapi.factory.order.IOrder) {
    return async (repos: {
        performance: ttts.repository.Performance;
    }) => {
        const order = params;
        const event = (<cinerinoapi.factory.order.IReservation>order.acceptedOffers[0].itemOffered).reservationFor;

        // 販売者都合の手数料なし返品であれば、情報連携
        let cancellationFee = 0;
        if (order.returner !== undefined && order.returner !== null) {
            const returner = order.returner;
            if (Array.isArray(returner.identifier)) {
                const cancellationFeeProperty = returner.identifier.find((p: any) => p.name === 'cancellationFee');
                if (cancellationFeeProperty !== undefined) {
                    cancellationFee = Number(cancellationFeeProperty.value);
                }
            }
        }

        let reason: string = cinerinoapi.factory.transaction.returnOrder.Reason.Customer;
        if (order.returner !== undefined && order.returner !== null) {
            const returner = order.returner;
            if (Array.isArray(returner.identifier)) {
                const reasonProperty = returner.identifier.find((p: any) => p.name === 'reason');
                if (reasonProperty !== undefined) {
                    reason = reasonProperty.value;
                }
            }
        }

        if (reason === cinerinoapi.factory.transaction.returnOrder.Reason.Seller && cancellationFee === 0) {
            // パフォーマンスに返品済数を連携
            await repos.performance.updateOne(
                { _id: event.id },
                {
                    $inc: {
                        'ttts_extension.refunded_count': 1,
                        'ttts_extension.unrefunded_count': -1
                    },
                    'ttts_extension.refund_update_at': new Date()
                }
            );

            // すべて返金完了したら、返金ステータス変更
            await repos.performance.updateOne(
                {
                    _id: event.id,
                    'ttts_extension.unrefunded_count': 0
                },
                {
                    'ttts_extension.refund_status': ttts.factory.performance.RefundStatus.Compeleted,
                    'ttts_extension.refund_update_at': new Date()
                }
            );
        }
    };
}

/**
 * 予約使用アクション変更イベント処理
 */
export function onActionStatusChanged(
    params: ttts.factory.chevre.action.IAction<ttts.factory.chevre.action.IAttributes<ttts.factory.chevre.actionType, any, any>>
) {
    return async (repos: {
        report: ttts.repository.Report;
    }) => {
        const action = params;

        if (action.typeOf === ttts.factory.chevre.actionType.UseAction) {
            const actionObject = action.object;
            if (Array.isArray(actionObject)) {
                const reservations =
                    <ttts.factory.chevre.reservation.IReservation<ttts.factory.chevre.reservationType.EventReservation>[]>
                    actionObject;

                const attended = action.actionStatus === ttts.factory.chevre.actionStatusType.CompletedActionStatus;
                const dateUsed = moment(action.startDate)
                    .toDate();

                await Promise.all(reservations.map(async (reservation) => {
                    if (reservation.typeOf === ttts.factory.chevre.reservationType.EventReservation
                        && typeof reservation.id === 'string'
                        && reservation.id.length > 0) {
                        await useReservationAction2report({
                            reservation,
                            attended,
                            dateUsed
                        })(repos);
                    }
                }));
            }
        }
    };
}

/**
 * 予約をレポートに反映する
 */
function useReservationAction2report(params: {
    reservation: ttts.factory.chevre.reservation.IReservation<ttts.factory.chevre.reservationType.EventReservation>;
    attended: boolean;
    dateUsed: Date;
}) {
    return async (repos: {
        report: ttts.repository.Report;
    }) => {
        const reservation = params.reservation;

        const reportDoc = await repos.report.aggregateSaleModel.findOne({
            'reservation.id': {
                $exists: true,
                $eq: reservation.id
            }
        })
            .exec();

        if (reportDoc !== null) {
            const report = <ttts.factory.report.order.IReport>reportDoc.toObject();
            const oldDateUsed = report.reservation.reservedTicket?.dateUsed;

            if (params.attended) {
                if (oldDateUsed !== undefined) {
                    // すでにdateUsedがあれば何もしない
                } else {
                    await repos.report.aggregateSaleModel.updateMany(
                        {
                            'reservation.id': {
                                $exists: true,
                                $eq: reservation.id
                            }
                        },
                        {
                            'reservation.reservedTicket.dateUsed': params.dateUsed
                        }
                    )
                        .exec();
                }
            } else {
                // すでにdateUsedがあれば、比較して同一であればunset
                if (oldDateUsed !== undefined) {
                    if (moment(params.dateUsed)
                        .isSame(moment(oldDateUsed))) {
                        await repos.report.aggregateSaleModel.updateMany(
                            {
                                'reservation.id': {
                                    $exists: true,
                                    $eq: reservation.id
                                }
                            },
                            {
                                $unset: {
                                    'reservation.reservedTicket.dateUsed': 1
                                }
                            }
                        )
                            .exec();
                    }
                } else {
                    // 同一でなければ何もしない
                }
            }
        }
    };
}
