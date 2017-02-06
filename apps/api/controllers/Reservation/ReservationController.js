"use strict";
const BaseController_1 = require("../BaseController");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const sendgrid = require("sendgrid");
const conf = require("config");
const validator = require("validator");
const qr = require("qr-image");
const moment = require("moment");
const fs = require("fs-extra");
class ReservationController extends BaseController_1.default {
    email() {
        let id = this.req.body.id;
        let to = this.req.body.to;
        if (!validator.isEmail(to)) {
            this.res.json({
                success: false,
                message: this.req.__('Message.invalid{{fieldName}}', { fieldName: this.req.__('Form.FieldName.email') })
            });
            return;
        }
        ttts_domain_1.Models.Reservation.findOne({
            _id: id,
            status: ttts_domain_2.ReservationUtil.STATUS_RESERVED
        }, (err, reservation) => {
            if (err) {
                this.res.json({
                    success: false,
                    message: this.req.__('Message.UnexpectedError')
                });
                return;
            }
            if (!reservation) {
                this.res.json({
                    success: false,
                    message: this.req.__('Message.NotFound')
                });
                return;
            }
            let title_ja = `${reservation.get('purchaser_name_ja')}様より東京タワーのチケットが届いております`;
            let title_en = `This is a notification that you have been invited to Tokyo International Film Festival by Mr./Ms. ${reservation.get('purchaser_name_en')}.`;
            this.res.render('email/resevation', {
                layout: false,
                reservations: [reservation],
                to: to,
                moment: moment,
                conf: conf,
                title_ja: title_ja,
                title_en: title_en,
                ReservationUtil: ttts_domain_2.ReservationUtil
            }, (err, html) => {
                if (err) {
                    this.res.json({
                        success: false,
                        message: this.req.__('Message.UnexpectedError')
                    });
                    return;
                }
                let mail = new sendgrid.mail.Mail(new sendgrid.mail.Email(conf.get('email.from'), conf.get('email.fromname')), `${title_ja} ${title_en}`, new sendgrid.mail.Email(to), new sendgrid.mail.Content("text/html", html));
                let reservationId = reservation.get('_id').toString();
                let attachmentQR = new sendgrid.mail.Attachment();
                attachmentQR.setFilename(`QR_${reservationId}.png`);
                attachmentQR.setType('image/png');
                attachmentQR.setContent(qr.imageSync(reservation.get('qr_str'), { type: 'png' }).toString('base64'));
                attachmentQR.setDisposition('inline');
                attachmentQR.setContentId(`qrcode_${reservationId}`);
                mail.addAttachment(attachmentQR);
                let attachment = new sendgrid.mail.Attachment();
                attachment.setFilename(`logo.png`);
                attachment.setType('image/png');
                attachment.setContent(fs.readFileSync(`${__dirname}/../../../../public/images/email/logo.png`).toString('base64'));
                attachment.setDisposition('inline');
                attachment.setContentId('logo');
                mail.addAttachment(attachment);
                this.logger.info('sending an email...email:', mail);
                let sg = sendgrid(process.env.SENDGRID_API_KEY);
                let request = sg.emptyRequest({
                    host: "api.sendgrid.com",
                    method: "POST",
                    path: "/v3/mail/send",
                    headers: {},
                    body: mail.toJSON(),
                    queryParams: {},
                    test: false,
                    port: ""
                });
                sg.API(request).then((response) => {
                    this.logger.info('an email sent.', response);
                    this.res.json({
                        success: true
                    });
                }, (err) => {
                    this.logger.error('an email unsent.', err);
                    this.res.json({
                        success: false,
                        message: err.message
                    });
                });
            });
        });
    }
    enter() {
        ttts_domain_1.Models.Reservation.update({
            _id: this.req.params.id
        }, {
            entered: true,
            entered_at: this.req.body.entered_at
        }, (err) => {
            if (err) {
                this.res.json({
                    success: false
                });
            }
            else {
                this.res.json({
                    success: true
                });
            }
        });
    }
    findByMvtkUser() {
        ttts_domain_1.Models.Reservation.find({
            purchaser_group: ttts_domain_2.ReservationUtil.PURCHASER_GROUP_CUSTOMER,
            status: ttts_domain_2.ReservationUtil.STATUS_RESERVED
        }).limit(10).exec((err, reservations) => {
            if (err) {
                this.res.json({
                    success: false,
                    reservations: []
                });
            }
            else {
                this.res.json({
                    success: true,
                    reservations: reservations
                });
            }
        });
    }
    findById() {
        let id = this.req.params.id;
        ttts_domain_1.Models.Reservation.findOne({
            _id: id,
            status: ttts_domain_2.ReservationUtil.STATUS_RESERVED
        }, (err, reservation) => {
            if (err) {
                this.res.json({
                    success: false,
                    reservation: null
                });
            }
            else {
                this.res.json({
                    success: true,
                    reservation: reservation
                });
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationController;
