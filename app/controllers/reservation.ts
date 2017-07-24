/**
 * 座席予約コントローラー
 *
 * @namespace controllers/reservation
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { NextFunction, Request, Response } from 'express';
import { NO_CONTENT, NOT_FOUND } from 'http-status';
import * as moment from 'moment';
import * as sendgrid from 'sendgrid';
// import * as validator from 'validator';

const debug = createDebug('ttts-api:controllers:reservation');

/**
 * 予約情報メールを送信する
 *
 * @memberof controllers/reservation
 */
export async function transfer(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id;
        const to = req.body.to;

        const reservation = await ttts.Models.Reservation.findOne({ _id: id, status: ttts.ReservationUtil.STATUS_RESERVED }).exec();
        if (reservation === null) {
            res.status(NOT_FOUND);
            res.json({
                data: null
            });

            return;
        }

        const titleJa = `${reservation.get('purchaser_name').ja}様よりTTTS_EVENT_NAMEのチケットが届いております`;
        // tslint:disable-next-line:max-line-length
        const titleEn = `This is a notification that you have been invited to Tokyo International Film Festival by Mr./Ms. ${reservation.get('purchaser_name').en}.`;

        res.render(
            'email/resevation',
            {
                layout: false,
                reservations: [reservation],
                to: to,
                moment: moment,
                titleJa: titleJa,
                titleEn: titleEn,
                ReservationUtil: ttts.ReservationUtil
            },
            async (renderErr, text) => {
                try {
                    if (renderErr instanceof Error) {
                        throw renderErr;
                    }

                    const mail = new sendgrid.mail.Mail(
                        new sendgrid.mail.Email(<string>process.env.EMAIL_FROM_ADDRESS, <string>process.env.EMAIL_FROM_NAME),
                        `${titleJa} ${titleEn}`,
                        new sendgrid.mail.Email(to),
                        new sendgrid.mail.Content('text/plain', text)
                    );

                    const sg = sendgrid(<string>process.env.SENDGRID_API_KEY);
                    const request = sg.emptyRequest({
                        host: 'api.sendgrid.com',
                        method: 'POST',
                        path: '/v3/mail/send',
                        headers: {},
                        body: mail.toJSON(),
                        queryParams: {},
                        test: false,
                        port: ''
                    });

                    await sg.API(request);
                    res.status(NO_CONTENT).end();
                } catch (error) {
                    console.error('an email unsent.', error);
                    next(error);
                }
            }
        );
    } catch (error) {
        next(error);
    }
}

/**
 * 入場履歴を追加する
 *
 * @memberof controllers/reservation
 */
export async function checkin(req: Request, res: Response, next: NextFunction) {
    try {
        const reservation = await ttts.Models.Reservation.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    checkins: {
                        when: moment().toDate(),
                        where: req.body.where, // どこで
                        why: req.body.why, // 何のために
                        how: req.body.how // どうやって
                    }
                }
            }
        ).exec();

        if (reservation === null) {
            res.status(NOT_FOUND).json({
                data: null
            });
        } else {
            res.status(NO_CONTENT).end();
        }
    } catch (error) {
        next(error);
    }
}

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
