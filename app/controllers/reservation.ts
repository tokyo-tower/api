/**
 * 座席予約コントローラー
 *
 * @namespace ReservationController
 */

import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';

import * as conf from 'config';
import { Request, Response } from 'express';
import * as moment from 'moment';
import * as sendgrid from 'sendgrid';
import * as validator from 'validator';

/**
 * 予約情報メールを送信する
 *
 * @memberOf ReservationController
 */
export async function email(req: Request, res: Response) {
    const id = req.body.id;
    const to = req.body.to;
    // メールアドレスの有効性チェック
    if (!validator.isEmail(to)) {
        res.json({
            success: false,
            message: req.__('Message.invalid{{fieldName}}', { fieldName: req.__('Form.FieldName.email') })
        });
        return;
    }

    try {
        const reservation = await Models.Reservation.findOne({ _id: id, status: ReservationUtil.STATUS_RESERVED }).exec();
        if (reservation === null) {
            res.json({
                success: false,
                message: req.__('Message.NotFound')
            });
            return;
        }

        const titleJa = `${reservation.get('purchaser_name_ja')}様よりCHEVRE_EVENT_NAMEのチケットが届いております`;
        // tslint:disable-next-line:max-line-length
        const titleEn = `This is a notification that you have been invited to Tokyo International Film Festival by Mr./Ms. ${reservation.get('purchaser_name_en')}.`;

        res.render(
            'email/resevation',
            {
                layout: false,
                reservations: [reservation],
                to: to,
                moment: moment,
                conf: conf,
                title_ja: titleJa,
                title_en: titleEn,
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
                    res.json({
                        success: true,
                        message: ''
                    });
                } catch (error) {
                    console.error('an email unsent.', error);
                    res.json({
                        success: false,
                        message: error.message
                    });
                }
            }
        );
    } catch (error) {
        res.json({
            success: false,
            message: req.__('Message.UnexpectedError')
        });
    }
}

/**
 * 入場履歴を追加する
 *
 * @memberOf ReservationController
 */
export async function checkin(req: Request, res: Response) {
    try {
        await Models.Reservation.findByIdAndUpdate(
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

        res.json({
            success: true
        });
    } catch (error) {
        res.json({
            success: false
        });
    }
}

/**
 * ムビチケユーザーで検索する
 *
 * @memberOf ReservationController
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
 * @memberOf ReservationController
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
