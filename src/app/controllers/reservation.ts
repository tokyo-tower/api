/**
 * 座席予約コントローラー
 * @namespace controllers.reservation
 */

import * as ttts from '@motionpicture/ttts-domain';

/**
 * チェックインインターフェース
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
 * @param {string} reservationId 予約ID
 * @param {ICheckin} checkin チェックインオブジェクト
 * @return {Promise<string | null>} 入場履歴の追加された予約ID
 * @memberof controllers/reservation
 */
export async function createCheckin(reservationId: string, checkin: ICheckin): Promise<string | null> {
    const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
    const reservation = await reservationRepo.reservationModel.findByIdAndUpdate(
        reservationId,
        {
            $push: {
                checkins: checkin
            }
        }
    ).exec();

    return (reservation === null) ? null : reservation.get('id').toString();
}
