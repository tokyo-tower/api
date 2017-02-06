"use strict";
const BaseController_1 = require("../BaseController");
const Util_1 = require("../../../common/Util/Util");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const ttts_domain_3 = require("@motionpicture/ttts-domain");
const GMOUtil_1 = require("../../../common/Util/GMO/GMOUtil");
const moment = require("moment");
const conf = require("config");
const mongoose = require("mongoose");
const sendgrid = require("sendgrid");
const emailTemplates = require("email-templates");
const qr = require("qr-image");
const fs = require("fs-extra");
const numeral = require("numeral");
let MONGOLAB_URI = conf.get('mongolab_uri');
class ReservationEmailCueController extends BaseController_1.default {
    watch() {
        mongoose.connect(MONGOLAB_URI);
        let count = 0;
        setInterval(() => {
            if (count > 10)
                return;
            count++;
            this.sendOne(() => {
                count--;
            });
        }, 500);
    }
    sendOne(cb) {
        this.logger.info('finding reservationEmailCue...');
        ttts_domain_1.Models.ReservationEmailCue.findOneAndUpdate({
            status: ttts_domain_3.ReservationEmailCueUtil.STATUS_UNSENT
        }, {
            status: ttts_domain_3.ReservationEmailCueUtil.STATUS_SENDING
        }, { new: true }, (err, cue) => {
            this.logger.info('reservationEmailCue found.', err, cue);
            if (err)
                return this.next(err, cue, this.logger, cb);
            if (!cue)
                return this.next(null, cue, this.logger, cb);
            Util_1.default.getReservationLogger(cue.get('payment_no'), (err, _logger) => {
                if (err)
                    return this.next(err, cue, this.logger, cb);
                ttts_domain_1.Models.Reservation.find({
                    payment_no: cue.get('payment_no')
                }, (err, reservations) => {
                    _logger.info('reservations for email found.', err, reservations.length);
                    if (err)
                        return this.next(err, cue, _logger, cb);
                    if (reservations.length === 0)
                        return this.next(null, cue, _logger, cb);
                    let to = '';
                    switch (reservations[0].get('purchaser_group')) {
                        case ttts_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF:
                            to = reservations[0].get('staff_email');
                            break;
                        default:
                            to = reservations[0].get('purchaser_email');
                            break;
                    }
                    _logger.info('to is', to);
                    if (!to)
                        return this.next(null, cue, _logger, cb);
                    let EmailTemplate = emailTemplates.EmailTemplate;
                    let dir;
                    let title_ja;
                    let title_en;
                    switch (cue.get('template')) {
                        case ttts_domain_3.ReservationEmailCueUtil.TEMPLATE_COMPLETE:
                            if (reservations[0].get('pre_customer')) {
                                dir = `${process.cwd()}/apps/task/views/email/reserve/complete4preCustomer`;
                                title_ja = '東京タワーチケット 購入完了のお知らせ';
                                title_en = 'Notice of Completion of TTTS Ticket Purchase';
                            }
                            else {
                                dir = `${process.cwd()}/apps/task/views/email/reserve/complete`;
                                title_ja = '東京タワーチケット 購入完了のお知らせ';
                                title_en = 'Notice of Completion of TTTS Ticket Purchase';
                            }
                            break;
                        case ttts_domain_3.ReservationEmailCueUtil.TEMPLATE_TEMPORARY:
                            if (reservations[0].get('pre_customer')) {
                                dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement4preCustomer`;
                                title_ja = '東京タワーチケット 仮予約完了のお知らせ';
                                title_en = 'Notice of Completion of Tentative Reservation for TTTS Tickets';
                            }
                            else {
                                dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement`;
                                title_ja = '東京タワーチケット 仮予約完了のお知らせ';
                                title_en = 'Notice of Completion of Tentative Reservation for TTTS Tickets';
                            }
                            break;
                        default:
                            return this.next(new Error(`${cue.get('template')} not implemented.`), cue, _logger, cb);
                    }
                    let template = new EmailTemplate(dir);
                    let locals = {
                        title_ja: title_ja,
                        title_en: title_en,
                        reservations: reservations,
                        moment: moment,
                        numeral: numeral,
                        conf: conf,
                        GMOUtil: GMOUtil_1.default,
                        ReservationUtil: ttts_domain_2.ReservationUtil
                    };
                    _logger.info('rendering template...dir:', dir);
                    template.render(locals, (err, result) => {
                        _logger.info('email template rendered.', err);
                        if (err)
                            return this.next(new Error('failed in rendering an email.'), cue, _logger, cb);
                        let mail = new sendgrid.mail.Mail(new sendgrid.mail.Email(conf.get('email.from'), conf.get('email.fromname')), `[QRコード付き]${title_ja} [QR CODE TICKET]${title_en}`, new sendgrid.mail.Email(to), new sendgrid.mail.Content("text/html", result.html));
                        if (cue.get('template') === ttts_domain_3.ReservationEmailCueUtil.TEMPLATE_COMPLETE) {
                            for (let reservation of reservations) {
                                let reservationId = reservation.get('_id').toString();
                                let attachment = new sendgrid.mail.Attachment();
                                attachment.setFilename(`QR_${reservationId}.png`);
                                attachment.setType("image/png");
                                attachment.setContent(qr.imageSync(reservation.get("qr_str"), { type: "png" }).toString('base64'));
                                attachment.setDisposition("inline");
                                attachment.setContentId(`qrcode_${reservationId}`);
                                mail.addAttachment(attachment);
                            }
                        }
                        let attachmentLogo = new sendgrid.mail.Attachment();
                        attachmentLogo.setFilename(`logo.png`);
                        attachmentLogo.setType("image/png");
                        attachmentLogo.setContent(fs.readFileSync(`${__dirname}/../../../../public/images/email/logo.png`).toString('base64'));
                        attachmentLogo.setDisposition("inline");
                        attachmentLogo.setContentId(`logo`);
                        mail.addAttachment(attachmentLogo);
                        _logger.info('sending an email...email:', mail);
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
                            _logger.info('an email sent.', response);
                            this.next(null, cue, _logger, cb);
                        }, (err) => {
                            this.next(err, cue, _logger, cb);
                        });
                    });
                });
            });
        });
    }
    next(err, cue, logger, cb) {
        if (!cue)
            return cb();
        let status = (err) ? ttts_domain_3.ReservationEmailCueUtil.STATUS_UNSENT : ttts_domain_3.ReservationEmailCueUtil.STATUS_SENT;
        logger.info('setting status...', status);
        cue.set('status', status);
        cue.save((err, res) => {
            logger.info('cue saved.', err, res);
            cb();
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationEmailCueController;
