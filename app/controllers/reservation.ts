/**
 * 座席予約コントローラー
 *
 * @namespace controllers/reservation
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import * as monapt from 'monapt';

const debug = createDebug('ttts-api:controllers:reservation');

/**
 * 予約情報を取得する
 *
 * @param {string} reservationId 予約ID
 * @return {Promise<monapt.Option<ttts.mongoose.Document>>} 予約ドキュメント
 * @memberof controllers/reservation
 */
export async function findById(reservationId: string): Promise<monapt.Option<ttts.mongoose.Document>> {
    const reservation = await ttts.Models.Reservation.findOne(
        {
            _id: reservationId,
            status: ttts.ReservationUtil.STATUS_RESERVED
        }
    ).exec();

    return (reservation === null) ? monapt.None : monapt.Option(reservation);
}

/**
 * チェックインインターフェース
 *
 * @interface ICheckin
 */
export interface ICheckin {
    when: Date;
    where: string; // どこで
    why: string; // 何のために
    how: string; // どうやって
}

/**
 * 入場履歴を追加する
 *
 * @param {string} reservationId 予約ID
 * @param {ICheckin} checkin チェックインオブジェクト
 * @return {Promise<monapt.Option<string>>} 入場履歴の追加された予約ID
 * @memberof controllers/reservation
 */
export async function createCheckin(reservationId: string, checkin: ICheckin): Promise<monapt.Option<string>> {
    const reservation = await ttts.Models.Reservation.findByIdAndUpdate(
        reservationId,
        {
            $push: {
                checkins: checkin
            }
        }
    ).exec();

    return (reservation === null) ? monapt.None : monapt.Option(reservation.get('id').toString());
}

/**
 * 予約キャンセル
 *
 * @param {string} performanceDay 上映日
 * @param {string} paymentNo 購入番号
 * @return {Promise<string[]>} キャンセルされた予約ID
 * @memberof controllers/reservation
 */
export async function cancel(performanceDay: string, paymentNo: string): Promise<string[]> {
    // 該当予約を検索
    const reservationIds = await ttts.Models.Reservation.distinct(
        '_id',
        {
            performance_day: performanceDay,
            payment_no: paymentNo,
            status: ttts.ReservationUtil.STATUS_RESERVED
        }
    ).exec().then((ids) => ids.map((id) => <string>id.toString()));

    debug('canceling reservations...', performanceDay, paymentNo, reservationIds);

    return await Promise.all(reservationIds.map(async (id) => {
        const canceledReservation = <ttts.mongoose.Document>await ttts.Models.Reservation.findByIdAndUpdate(
            id,
            {
                $set: { status: ttts.ReservationUtil.STATUS_AVAILABLE },
                $unset: { payment_no: 1, ticket_type: 1, expired_at: 1 }
            }
        ).exec();

        return <string>canceledReservation.get('id');
    }));
}
