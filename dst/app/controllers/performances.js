"use strict";
/**
 * パフォーマンスコントローラー
 * @namespace controllers.performance
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
function aggregateCounts(performance, reservations, checkpoints) {
    // tslint:disable-next-line:max-func-body-length
    return () => {
        // 全予約数
        const totalReservationCount = reservations.filter((r) => (r.status === ttts.factory.reservationStatusType.ReservationConfirmed)).length;
        // 場所ごとの入場情報を集計
        const checkinInfosByWhere = checkpoints.map((checkpoint) => {
            return {
                where: checkpoint.where,
                checkins: [],
                arrivedCountsByTicketType: performance.ticket_type_group.ticket_types.map((t) => {
                    return { ticketType: t.id, ticketCategory: t.ttts_extension.category, count: 0 };
                })
            };
        });
        reservations.forEach((reservation) => {
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
        reservations.map((reservation) => {
            // 券種ごとの予約数をセット
            reservationCountsByTicketType.find((c) => c.ticketType === reservation.ticket_type).count += 1;
        });
        const aggregation = {
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
            const checkinCountsByTicketType = aggregation.checkinCountsByWhere.find((c) => c.where === checkinInfoByWhere.where);
            checkinInfoByWhere.checkins.forEach((checkin) => {
                checkinCountsByTicketType.checkinCountsByTicketType.find((c) => c.ticketType === checkin.ticketType).count += 1;
            });
        });
        return aggregation;
    };
}
exports.aggregateCounts = aggregateCounts;
