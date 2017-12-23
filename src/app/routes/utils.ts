/**
 * utilsルーター
 * @ignore
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { Router } from 'express';

const utilsRouter = Router();
const debug = createDebug('ttts-api:routes:utils');

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

interface ISchedule {
    performanceId: string;
    start_time: string;
    end_time: string;
    /**
     * 全予約数
     */
    totalReservedNum: number;
    /**
     * 券種ごとの予約数
     */
    reservationCountsByTicketType: IReservationCountByTicketType[];
    /**
     * 場所ごとの入場数
     */
    checkinCountsByWhere: ICheckinCountByWhere[];
}

interface ICheckinInfo {
    checkpoints: {
        where: string;
        description: string;
    }[];
    schedules: ISchedule[];
}

// api・予約通過確認
// tslint:disable-next-line:max-func-body-length
utilsRouter.get('/pass/list', async (req, res, next) => {
    try {
        // 取得対象のパフォーマンス取得
        const performanceRepo = new ttts.repository.Performance(ttts.mongoose.connection);

        const performances = await performanceRepo.performanceModel.find(
            {
                day: req.query.day
            }
        )
            .populate('film screen theater')
            .populate({ path: 'ticket_type_group', populate: { path: 'ticket_types' } })
            .exec().then((docs) => docs.map((doc) => <ttts.factory.performance.IPerformanceWithDetails>doc.toObject()));
        debug('performances found,', performances.length);

        // 予約情報取得
        const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
        const reservations = await reservationRepo.reservationModel.find(
            {
                performance: { $in: performances.map((p) => p.id) },
                status: ttts.factory.reservationStatusType.ReservationConfirmed
            }
        ).exec().then((docs) => docs.map((doc) => <ttts.factory.reservation.event.IReservation>doc.toObject()));
        debug('reservations found,', reservations.length);

        // チェックポイント名称取得
        const ownerRepo = new ttts.repository.Owner(ttts.mongoose.connection);
        const owners = await ownerRepo.ownerModel.find({ notes: '1' }).exec();

        // レスポンス編集
        const data: ICheckinInfo = {
            checkpoints: owners.map((owner) => {
                return {
                    where: owner.get('group'),
                    description: owner.get('description')
                };
            }),
            schedules: []
        };

        // パフォーマンスごとに集計
        performances.forEach((performance) => {
            const reservations4performance = reservations.filter((r) => r.performance === performance.id);
            debug('creating schedule...');

            // 全予約数
            const reservedNum = reservations4performance.filter(
                (r) => (r.status === ttts.factory.reservationStatusType.ReservationConfirmed)
            ).length;

            // 場所ごとの入場情報を集計
            const checkinInfosByWhere: ICheckinInfosByWhere = data.checkpoints.map((checkpoint) => {
                return {
                    where: checkpoint.where,
                    checkins: [],
                    arrivedCountsByTicketType: performance.ticket_type_group.ticket_types.map((t) => {
                        return { ticketType: t.id, ticketCategory: t.ttts_extension.category, count: 0 };
                    })
                };
            });

            reservations4performance.forEach((reservation) => {
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
            reservations4performance.map((reservation) => {
                // 券種ごとの予約数をセット
                (<IReservationCountByTicketType>reservationCountsByTicketType.find(
                    (c) => c.ticketType === reservation.ticket_type
                )).count += 1;
            });

            const schedule: ISchedule = {
                performanceId: performance.id,
                start_time: performance.start_time,
                end_time: performance.end_time,
                totalReservedNum: reservedNum,
                reservationCountsByTicketType: reservationCountsByTicketType,
                // 場所ごとに、券種ごとの入場者数初期値をセット
                checkinCountsByWhere: data.checkpoints.map((checkpoint) => {
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
                const checkinCountsByTicketType = <ICheckinCountByWhere>schedule.checkinCountsByWhere.find(
                    (c) => c.where === checkinInfoByWhere.where
                );

                checkinInfoByWhere.checkins.forEach((checkin) => {
                    (<ICheckinCountsByTicketType>checkinCountsByTicketType.checkinCountsByTicketType.find(
                        (c) => c.ticketType === checkin.ticketType
                    )).count += 1;
                });
            });

            data.schedules.push(schedule);
        });

        res.json(data);
    } catch (error) {
        next(new ttts.factory.errors.ServiceUnavailable('予約通過確認情報取得失敗'));
    }
});

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

export default utilsRouter;
