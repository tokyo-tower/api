/**
 * 座席予約コントローラー
 *
 * @namespace controller/reservation
 */

import { Models } from '@motionpicture/ttts-domain';
import { ReservationUtil } from '@motionpicture/ttts-domain';

import * as conf from 'config';
import { NextFunction, Request, Response } from 'express';
import { NO_CONTENT, NOT_FOUND } from 'http-status';
import * as moment from 'moment';
import * as sendgrid from 'sendgrid';
// import * as validator from 'validator';

/**
 * 予約情報メールを送信する
 *
 * @memberOf controller/reservation
 */
export async function transfer(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id;
        const to = req.body.to;

        const reservation = await Models.Reservation.findOne({ _id: id, status: ReservationUtil.STATUS_RESERVED }).exec();
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
                conf: conf,
                titleJa: titleJa,
                titleEn: titleEn,
                ReservationUtil: ReservationUtil
            },
            async (renderErr, text) => {
                try {
                    if (renderErr instanceof Error) {
                        throw renderErr;
                    }

                    const mail = new sendgrid.mail.Mail(
                        new sendgrid.mail.Email(conf.get<string>('email.from'), conf.get<string>('email.fromname')),
                        `${titleJa} ${titleEn}`,
                        new sendgrid.mail.Email(to),
                        new sendgrid.mail.Content('text/plain', text)
                    );

                    const sg = sendgrid(process.env.SENDGRID_API_KEY);
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
 * @memberOf controller/reservation
 */
export async function checkin(req: Request, res: Response, next: NextFunction) {
    try {
        const reservation = await Models.Reservation.findByIdAndUpdate(
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

/**
 * ムビチケユーザーで検索する
 *
 * @memberOf controller/reservation
 */
export async function findByMvtkUser(_: Request, res: Response) {
    // ひとまずデモ段階では、一般予約を10件返す
    const LIMIT = 10;

    try {
        const reservations = await Models.Reservation.find(
            {
                purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                status: ReservationUtil.STATUS_RESERVED
            }
        ).limit(LIMIT).exec();

        res.json({
            success: true,
            reservations: reservations
        });
    } catch (error) {
        res.json({
            success: false,
            reservations: []
        });
    }
}

/**
 * IDで検索する
 *
 * @memberOf controller/reservation
 */
export async function findById(req: Request, res: Response) {
    const id = req.params.id;

    try {
        const reservation = await Models.Reservation.findOne(
            {
                _id: id,
                status: ReservationUtil.STATUS_RESERVED
            }
        ).exec();

        res.json({
            success: true,
            reservation: reservation
        });
    } catch (error) {
        res.json({
            success: false,
            reservation: null
        });
    }
}
