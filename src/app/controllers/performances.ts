/**
 * パフォーマンスコントローラー
 * @namespace controllers.performance
 */

import * as ttts from '@motionpicture/ttts-domain';

interface ICheckinCountsByTicketType {
    ticketType: string;
    ticketCategory: ttts.factory.ticketTypeCategory;
    count: number;
}

interface ICheckinCountByWhere {
    /**
     * 入場場所
     */
    where: string;
    /**
     * 券種ごとの入場数
     */
    checkinCountsByTicketType: ICheckinCountsByTicketType[];
}

export interface ICountAggregationByPerformance {
    id: string;
    startDate: Date;
    endDate: Date;
    /**
     * 全予約数
     */
    totalReservationCount: number;
    /**
     * 全入場数
     */
    totalCheckinCount: number;
    /**
     * 券種ごとの予約数
     */
    reservationCountsByTicketType: IReservationCountByTicketType[];
    /**
     * 場所ごとの入場数
     */
    checkinCountsByWhere: ICheckinCountByWhere[];
}

export interface ICheckpoint {
    where: string;
    description: string;
}

export function aggregateCounts(
    performance: ttts.factory.performance.IPerformanceWithDetails,
    reservations: ttts.factory.reservation.event.IReservation[],
    checkpoints: ICheckpoint[]
) {
    // tslint:disable-next-line:max-func-body-length
    return () => {
        // 全予約数
        const totalReservationCount = reservations.filter(
            (r) => (r.status === ttts.factory.reservationStatusType.ReservationConfirmed)
        ).length;

        // 場所ごとの入場情報を集計
        const checkinInfosByWhere: ICheckinInfosByWhere = checkpoints.map((checkpoint) => {
            return {
                where: checkpoint.where,
                checkins: [],
                arrivedCountsByTicketType: performance.ticket_type_group.ticket_types.map((t) => {
                    return { ticketType: t.id, ticketCategory: t.ttts_extension.category, count: 0 };
                })
            };
        });

        reservations.forEach((reservation) => {
            const tempCheckinWhereArray: string[] = [];

            reservation.checkins.forEach((checkin) => {
                // 同一ポイントでの重複チェックインを除外
                // ※チェックポイントに現れた物理的な人数を数えるのが目的なのでチェックイン行為の重複はここでは問題にしない
                if (tempCheckinWhereArray.indexOf(checkin.where) >= 0) {
                    return;
                }

                tempCheckinWhereArray.push(checkin.where);

                const checkinInfoByWhere = <ICheckinInfoByWhere>checkinInfosByWhere.find((info) => info.where === checkin.where);

                // チェックイン数セット
                (<IArrivedCountByTicketType>checkinInfoByWhere.arrivedCountsByTicketType.find(
                    (c) => c.ticketType === reservation.ticket_type
                )).count += 1;

                // チェックイン数セット
                checkinInfoByWhere.checkins.push({
                    ...checkin,
                    ...{
                        ticketType: reservation.ticket_type,
                        ticketCategory: reservation.ticket_ttts_extension.category
                    }
                });
            });
        });

        // 券種ごとの予約数を集計
        const reservationCountsByTicketType = performance.ticket_type_group.ticket_types.map((t) => {
            return { ticketType: t.id, count: 0 };
        });
        reservations.map((reservation) => {
            // 券種ごとの予約数をセット
            (<IReservationCountByTicketType>reservationCountsByTicketType.find(
                (c) => c.ticketType === reservation.ticket_type
            )).count += 1;
        });

        const aggregation: ICountAggregationByPerformance = {
            id: performance.id,
            startDate: performance.start_date,
            endDate: performance.end_date,
            totalReservationCount: totalReservationCount,
            totalCheckinCount: checkinInfosByWhere.reduce((a, b) => a + b.checkins.length, 0),
            reservationCountsByTicketType: reservationCountsByTicketType,
            // 場所ごとに、券種ごとの入場者数初期値をセット
            checkinCountsByWhere: checkpoints.map((checkpoint) => {
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
            const checkinCountsByTicketType = <ICheckinCountByWhere>aggregation.checkinCountsByWhere.find(
                (c) => c.where === checkinInfoByWhere.where
            );

            checkinInfoByWhere.checkins.forEach((checkin) => {
                (<ICheckinCountsByTicketType>checkinCountsByTicketType.checkinCountsByTicketType.find(
                    (c) => c.ticketType === checkin.ticketType
                )).count += 1;
            });
        });

        return aggregation;
    };
}
export interface IReservedExtra {
    ticketType: string;
    reservedNum: number;
}
export interface IReservationCountByTicketType {
    ticketType: string;
    count: number;
}
export interface IReservationAggregation {
    /**
     * パフォーマンス情報
     */
    performance: ttts.factory.performance.IPerformanceWithDetails;
    /**
     * 予約リスト
     */
    reservations: ttts.factory.reservation.event.IReservation[];
    /**
     * 券種ごとの予約数
     */
    reservationCountsByTicketType: IReservationCountByTicketType[];
}

export type IReservationAggregations = IReservationAggregation[];

export type ITicketType = ttts.factory.performance.ITicketType;

/**
 * 券種ごとの入場数インターフェース
 * @interface
 */
export interface IArrivedCountByTicketType {
    ticketType: string;
    ticketCategory: ttts.factory.ticketTypeCategory;
    count: number;
}
/**
 * 入場場所ごとの入場履歴情報
 */
export interface ICheckinInfoByWhere {
    /**
     * 入場場所
     */
    where: string;
    /**
     * 入場履歴
     */
    checkins: ICheckin[];
    /**
     * 券種ごとの入場数
     */
    arrivedCountsByTicketType: IArrivedCountByTicketType[];
}
export type ICheckinInfosByWhere = ICheckinInfoByWhere[];
/**
 * パフォーマンスごとの入場情報インターフェース
 * @interface
 */
export interface ICheckinInfoByPerformance {
    performanceId: string;
    /**
     * 場所ごとの入場情報
     */
    checkinInfosByWhere: ICheckinInfosByWhere;
}

export type ICheckin = ttts.factory.reservation.event.ICheckin & {
    ticketType: string;
    ticketCategory: ttts.factory.ticketTypeCategory;
};
