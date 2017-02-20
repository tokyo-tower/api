/**
 * 座席予約コントローラー
 *
 * @namespace api/ReservationController
 */
"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const conf = require("config");
const fs = require("fs-extra");
const moment = require("moment");
const qr = require("qr-image");
const sendgrid = require("sendgrid");
const validator = require("validator");
/**
 * 予約情報メールを送信する
 *
 * @memberOf api/ReservationController
 */
// tslint:disable-next-line:max-func-body-length
function email(req, res) {
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
    ttts_domain_1.Models.Reservation.findOne({
        _id: id,
        status: ttts_domain_2.ReservationUtil.STATUS_RESERVED
    }, (err, reservation) => {
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
        const titleJa = `${reservation.get('purchaser_name_ja')}様より東京タワーのチケットが届いております`;
        const titleEn = `This is a notification that you have been invited to Tokyo International Film Festival by Mr./Ms. ${reservation.get('purchaser_name_en')}.`;
        res.render('email/resevation', {
            layout: false,
            reservations: [reservation],
            to: to,
            moment: moment,
            conf: conf,
            title_ja: titleJa,
            title_en: titleEn,
            ReservationUtil: ttts_domain_2.ReservationUtil
        }, (renderErr, html) => {
            if (renderErr) {
                res.json({
                    success: false,
                    message: req.__('Message.UnexpectedError')
                });
                return;
            }
            const mail = new sendgrid.mail.Mail(new sendgrid.mail.Email(conf.get('email.from'), conf.get('email.fromname')), `${titleJa} ${titleEn}`, new sendgrid.mail.Email(to), new sendgrid.mail.Content('text/html', html));
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
            }, (sendErr) => {
                console.error('an email unsent.', sendErr);
                res.json({
                    success: false,
                    message: sendErr.message
                });
            });
        });
    });
}
exports.email = email;
/**
 * 入場グラグをたてる
 *
 * @memberOf api/ReservationController
 */
function enter(req, res) {
    ttts_domain_1.Models.Reservation.update({
        _id: req.params.id
    }, {
        entered: true,
        entered_at: req.body.entered_at
    }, (err) => {
        if (err) {
            res.json({
                success: false
            });
        }
        else {
            res.json({
                success: true
            });
        }
    });
}
exports.enter = enter;
/**
 * ムビチケユーザーで検索する
 *
 * @memberOf api/ReservationController
 */
// tslint:disable-next-line:variable-name
function findByMvtkUser(_req, res) {
    // ひとまずデモ段階では、一般予約を10件返す
    const LIMIT = 10;
    ttts_domain_1.Models.Reservation.find({
        purchaser_group: ttts_domain_2.ReservationUtil.PURCHASER_GROUP_CUSTOMER,
        status: ttts_domain_2.ReservationUtil.STATUS_RESERVED
    }).limit(LIMIT).exec((err, reservations) => {
        if (err) {
            res.json({
                success: false,
                reservations: []
            });
        }
        else {
            res.json({
                success: true,
                reservations: reservations
            });
        }
    });
}
exports.findByMvtkUser = findByMvtkUser;
/**
 * IDで検索する
 *
 * @memberOf api/ReservationController
 */
function findById(req, res) {
    const id = req.params.id;
    ttts_domain_1.Models.Reservation.findOne({
        _id: id,
        status: ttts_domain_2.ReservationUtil.STATUS_RESERVED
    }, (err, reservation) => {
        if (err) {
            res.json({
                success: false,
                reservation: null
            });
        }
        else {
            res.json({
                success: true,
                reservation: reservation
            });
        }
    });
}
exports.findById = findById;
