/**
 * 座席予約コントローラー
 *
 * @namespace api/ReservationController
 */

import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';

import * as conf from 'config';
import { Request, Response } from 'express';
import * as fs from 'fs-extra';
import * as moment from 'moment';
import * as qr from 'qr-image';
import * as sendgrid from 'sendgrid';
import * as validator from 'validator';

/**
 * 予約情報メールを送信する
 *
 * @memberOf api/ReservationController
 */
// tslint:disable-next-line:max-func-body-length
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
        const reservation = await Models.Reservation.findOne(
            {
                _id: id,
                status: ReservationUtil.STATUS_RESERVED
            }
        ).exec();

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
            'email/resevation', {
                layout: false,
                reservations: [reservation],
                to: to,
                moment: moment,
                conf: conf,
                title_ja: titleJa,
                title_en: titleEn,
                ReservationUtil: ReservationUtil
            },
            async (renderErr, html) => {
                if (renderErr instanceof Error) {
                    res.json({
                        success: false,
                        message: req.__('Message.UnexpectedError')
                    });
                    return;
                }

                const mail = new sendgrid.mail.Mail(
                    new sendgrid.mail.Email(conf.get<string>('email.from'), conf.get<string>('email.fromname')),
                    `${titleJa} ${titleEn}`,
                    new sendgrid.mail.Email(to),
                    new sendgrid.mail.Content('text/html', html)
                );

                const reservationId = reservation.get('_id').toString();
                const attachmentQR = new sendgrid.mail.Attachment();
                attachmentQR.setFilename(`QR_${reservationId}.png`);
                attachmentQR.setType('image/png');
                attachmentQR.setContent(qr.imageSync(reservation.get('qr_str'), { type: 'png' }).toString('base64'));
                attachmentQR.setDisposition('inline');
                attachmentQR.setContentId(`qrcode_${reservationId}`);
                mail.addAttachment(attachmentQR);

                // logo
                const attachment = new sendgrid.mail.Attachment();
                attachment.setFilename('logo.png');
                attachment.setType('image/png');
                attachment.setContent(fs.readFileSync(`${__dirname}/../../../public/images/email/logo.png`).toString('base64'));
                attachment.setDisposition('inline');
                attachment.setContentId('logo');
                mail.addAttachment(attachment);

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

                try {
                    await sg.API(request);
                    res.json({
                        success: true
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
 * 入場グラグをたてる
 *
 * @memberOf api/ReservationController
 */
export async function enter(req: Request, res: Response) {
    try {
        await Models.Reservation.update(
            {
                _id: req.params.id
            },
            {
                entered: true,
                entered_at: req.body.entered_at
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
 * @memberOf api/ReservationController
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
 * @memberOf api/ReservationController
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
