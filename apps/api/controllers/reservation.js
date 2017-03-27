/**
 * 座席予約コントローラー
 *
 * @namespace api/ReservationController
 */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
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
    return __awaiter(this, void 0, void 0, function* () {
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
            const reservation = yield chevre_domain_1.Models.Reservation.findOne({
                _id: id,
                status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
            }).exec();
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
            res.render('email/resevation', {
                layout: false,
                reservations: [reservation],
                to: to,
                moment: moment,
                conf: conf,
                title_ja: titleJa,
                title_en: titleEn,
                ReservationUtil: chevre_domain_2.ReservationUtil
            }, (renderErr, html) => __awaiter(this, void 0, void 0, function* () {
                if (renderErr instanceof Error) {
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
                    yield sg.API(request);
                    res.json({
                        success: true
                    });
                }
                catch (error) {
                    console.error('an email unsent.', error);
                    res.json({
                        success: false,
                        message: error.message
                    });
                }
            }));
        }
        catch (error) {
            res.json({
                success: false,
                message: req.__('Message.UnexpectedError')
            });
        }
    });
}
exports.email = email;
/**
 * 入場グラグをたてる
 *
 * @memberOf api/ReservationController
 */
function enter(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield chevre_domain_1.Models.Reservation.update({
                _id: req.params.id
            }, {
                entered: true,
                entered_at: req.body.entered_at
            }).exec();
            res.json({
                success: true
            });
        }
        catch (error) {
            res.json({
                success: false
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
function findByMvtkUser(_, res) {
    return __awaiter(this, void 0, void 0, function* () {
        // ひとまずデモ段階では、一般予約を10件返す
        const LIMIT = 10;
        try {
            const reservations = yield chevre_domain_1.Models.Reservation.find({
                purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_CUSTOMER,
                status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
            }).limit(LIMIT).exec();
            res.json({
                success: true,
                reservations: reservations
            });
        }
        catch (error) {
            res.json({
                success: false,
                reservations: []
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
    return __awaiter(this, void 0, void 0, function* () {
        const id = req.params.id;
        try {
            const reservation = yield chevre_domain_1.Models.Reservation.findOne({
                _id: id,
                status: chevre_domain_2.ReservationUtil.STATUS_RESERVED
            }).exec();
            res.json({
                success: true,
                reservation: reservation
            });
        }
        catch (error) {
            res.json({
                success: false,
                reservation: null
            });
        }
    });
}
exports.findById = findById;
