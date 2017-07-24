/**
 * 取引コントローラー
 *
 * @namespace controllers/transaction
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as monapt from 'monapt';

const debug = createDebug('ttts-api:controllers:transaction');
/**
 * 仮予約有効期間(分)
 * POSの要件に応じてここを調整してください。
 */
const TEMPORARY_RESERVATION_EXPIRES_IN_MINUTES = 15;

export interface IAuthorization {
    // tslint:disable-next-line:no-reserved-keywords
    type: string;
    id: string;
    attributes: {
        expires_at: string;
    };
}

export async function createAuthorization(performanceId: string): Promise<monapt.Option<IAuthorization>> {
    // 座席をひとつ仮予約
    const reservationDoc = await ttts.Models.Reservation.findOneAndUpdate(
        {
            performance: performanceId,
            status: ttts.ReservationUtil.STATUS_AVAILABLE
        },
        {
            status: ttts.ReservationUtil.STATUS_TEMPORARY,
            expired_at: moment().add(TEMPORARY_RESERVATION_EXPIRES_IN_MINUTES, 'minutes').toDate()
        },
        {
            new: true
        }
    );

    if (reservationDoc === null) {
        return monapt.None;
    } else {
        return monapt.Option({
            type: 'authorizations',
            id: reservationDoc.get('id'),
            attributes: {
                expires_at: reservationDoc.get('expired_at')
            }
        });
    }
}

export async function deleteAuthorization(authorizationId: string): Promise<void> {
    debug('deleting authorization...', authorizationId);
}

export async function confirm(): Promise<void> {
    debug('confirming transaction...');
}

export async function cancel(): Promise<void> {
    debug('canceling reservations...');
}
