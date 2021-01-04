import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';
import * as moment from 'moment-timezone';

/**
 * イベント変更検知時の処理
 */
export function onEventChanged(params: cinerinoapi.factory.chevre.event.IEvent<cinerinoapi.factory.chevre.eventType.ScreeningEvent>) {
    return async (repos: {
        performance: ttts.repository.Performance;
        task: ttts.repository.Task;
    }) => {
        const event = params;

        // パフォーマンス登録
        const performance: ttts.factory.performance.IPerformance = {
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

        await repos.performance.saveIfNotExists(performance);

        // 集計タスク作成
        // const aggregateTask: ttts.factory.task.aggregateEventReservations.IAttributes = {
        //     name: <any>ttts.factory.taskName.AggregateEventReservations,
        //     project: { typeOf: ttts.factory.chevre.organizationType.Project, id: event.project.id },
        //     status: ttts.factory.taskStatus.Ready,
        //     runsAt: new Date(),
        //     remainingNumberOfTries: 3,
        //     numberOfTried: 0,
        //     executionResults: [],
        //     data: { id: performance.id }
        // };
        // await repos.task.save(aggregateTask);
    };
}

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
 * 予約取消時処理
 */
export function onReservationStatusChanged(
    params: cinerinoapi.factory.chevre.reservation.IReservation<cinerinoapi.factory.chevre.reservationType.EventReservation>
) {
    return async (repos: {
        reservation: ttts.repository.Reservation;
        task: ttts.repository.Task;
    }) => {
        const reservation = params;

        switch (reservation.reservationStatus) {
            case cinerinoapi.factory.chevre.reservationStatusType.ReservationCancelled:
                // 東京タワーDB側の予約もステータス変更
                await repos.reservation.cancel({ id: reservation.id });

                break;

            case cinerinoapi.factory.chevre.reservationStatusType.ReservationConfirmed:
                // 予約データを作成する
                const tttsResevation: ttts.factory.reservation.event.IReservation = {
                    ...reservation,
                    reservationFor: {
                        ...reservation.reservationFor,
                        doorTime: (reservation.reservationFor.doorTime !== undefined)
                            ? moment(reservation.reservationFor.doorTime)
                                .toDate()
                            : undefined,
                        endDate: moment(reservation.reservationFor.endDate)
                            .toDate(),
                        startDate: moment(reservation.reservationFor.startDate)
                            .toDate()
                    },
                    checkins: []
                };
                await repos.reservation.saveEventReservation(tttsResevation);

                break;

            case cinerinoapi.factory.chevre.reservationStatusType.ReservationHold:
                // 車椅子予約であれば、レート制限

                break;

            case cinerinoapi.factory.chevre.reservationStatusType.ReservationPending:
                break;

            default:
        }

        // 集計タスク作成
        const aggregateTask: ttts.factory.task.aggregateEventReservations.IAttributes = {
            name: <any>ttts.factory.taskName.AggregateEventReservations,
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
        await repos.task.save(aggregateTask);
    };
}
