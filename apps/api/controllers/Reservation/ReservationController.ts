import * as express from 'express';
import { Models } from '@motionpicture/ttts-domain';
import { ReservationUtil } from '@motionpicture/ttts-domain';
import * as sendgrid from 'sendgrid';
import * as conf from 'config';
import * as validator from 'validator';
import * as qr from 'qr-image';
import * as moment from 'moment';
import * as fs from 'fs-extra';

/**
 * 予約情報メールを送信する
 */
export function email(req: express.Request, res: express.Response): void {
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

    Models.Reservation.findOne(
        {
            _id: id,
            status: ReservationUtil.STATUS_RESERVED
        },
        (err, reservation) => {
            if (err) {
                res.json({
                    success: false,
                    message: req.__('Message.UnexpectedError')
                });
                return;
            }

            if (!reservation) {
                res.json({
                    success: false,
                    message: req.__('Message.NotFound')
                });
                return;
            }

            const title_ja = `${reservation.get('purchaser_name_ja')}様より東京タワーのチケットが届いております`;
            const title_en = `This is a notification that you have been invited to Tokyo International Film Festival by Mr./Ms. ${reservation.get('purchaser_name_en')}.`;

            res.render('email/resevation', {
                layout: false,
                reservations: [reservation],
                to: to,
                moment: moment,
                conf: conf,
                title_ja: title_ja,
                title_en: title_en,
                ReservationUtil: ReservationUtil
            },         (err, html) => {
                if (err) {
                    res.json({
                        success: false,
                        message: req.__('Message.UnexpectedError')
                    });
                    return;
                }

                const mail = new sendgrid.mail.Mail(
                    new sendgrid.mail.Email(conf.get<string>('email.from'), conf.get<string>('email.fromname')),
                    `${title_ja} ${title_en}`,
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
                attachment.setFilename(`logo.png`);
                attachment.setType('image/png');
                attachment.setContent(fs.readFileSync(`${__dirname}/../../../../public/images/email/logo.png`).toString('base64'));
                attachment.setDisposition('inline');
                attachment.setContentId('logo');
                mail.addAttachment(attachment);

                console.log('sending an email...email:', mail);
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
                sg.API(request).then((response) => {
                    console.log('an email sent.', response);
                    res.json({
                        success: true
                    });
                },                   (err) => {
                    console.error('an email unsent.', err);
                    res.json({
                        success: false,
                        message: err.message
                    });
                });
            });
        }
    );
}

/**
 * 入場グラグをたてる
 */
export function enter(req: express.Request, res: express.Response): void {
    Models.Reservation.update(
        {
            _id: req.params.id
        },
        {
            entered: true,
            entered_at: req.body.entered_at
        },
        (err) => {
            if (err) {
                res.json({
                    success: false
                });
            } else {
                res.json({
                    success: true
                });
            }
        }
    );
}

export function findByMvtkUser(_req: express.Request, res: express.Response): void {
    // ひとまずデモ段階では、一般予約を10件返す
    Models.Reservation.find(
        {
            purchaser_group: ReservationUtil.PURCHASER_GROUP_CUSTOMER,
            status: ReservationUtil.STATUS_RESERVED
        }).limit(10).exec((err, reservations) => {
            if (err) {
                res.json({
                    success: false,
                    reservations: []
                });
            } else {
                res.json({
                    success: true,
                    reservations: reservations
                });
            }
        }
        );
}

export function findById(req: express.Request, res: express.Response): void {
    const id = req.params.id;

    Models.Reservation.findOne(
        {
            _id: id,
            status: ReservationUtil.STATUS_RESERVED
        },
        (err, reservation) => {
            if (err) {
                res.json({
                    success: false,
                    reservation: null
                });
            } else {
                res.json({
                    success: true,
                    reservation: reservation
                });
            }
        }
    );
}