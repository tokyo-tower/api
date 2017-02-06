import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import { Models } from "@motionpicture/ttts-domain";
import { ReservationUtil } from "@motionpicture/ttts-domain";
import { ReservationEmailCueUtil } from "@motionpicture/ttts-domain";
import GMOUtil from '../../../common/Util/GMO/GMOUtil';
import moment = require('moment');
import conf = require('config');
import mongoose = require('mongoose');
import sendgrid = require('sendgrid');
import emailTemplates = require('email-templates');
import qr = require('qr-image');
import fs = require('fs-extra');
import numeral = require('numeral');
import log4js = require('log4js');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class ReservationEmailCueController extends BaseController {
    /**
     * キューを監視させる
     */
    public watch(): void {
        mongoose.connect(MONGOLAB_URI);
        let count = 0;

        setInterval(() => {
            if (count > 10) return;

            count++;
            this.sendOne(() => {
                count--;
            });
        }, 500);
    }

    /**
     * 予約完了メールを送信する
     */
    public sendOne(cb: () => void): void {
        this.logger.info('finding reservationEmailCue...');
        Models.ReservationEmailCue.findOneAndUpdate({
            status: ReservationEmailCueUtil.STATUS_UNSENT
        }, {
                status: ReservationEmailCueUtil.STATUS_SENDING
            }, { new: true }, (err, cue) => {
                this.logger.info('reservationEmailCue found.', err, cue);
                if (err) return this.next(err, cue, this.logger, cb);
                if (!cue) return this.next(null, cue, this.logger, cb);

                // 予約ロガーを取得
                Util.getReservationLogger(cue.get('payment_no'), (err, _logger) => {
                    if (err) return this.next(err, cue, this.logger, cb);

                    Models.Reservation.find({
                        payment_no: cue.get('payment_no')
                    }, (err, reservations) => {
                        _logger.info('reservations for email found.', err, reservations.length);
                        if (err) return this.next(err, cue, _logger, cb);
                        if (reservations.length === 0) return this.next(null, cue, _logger, cb);

                        let to = '';
                        switch (reservations[0].get('purchaser_group')) {
                            case ReservationUtil.PURCHASER_GROUP_STAFF:
                                to = reservations[0].get('staff_email')
                                break;

                            default:
                                to = reservations[0].get('purchaser_email')
                                break;
                        }

                        _logger.info('to is', to);
                        if (!to) return this.next(null, cue, _logger, cb);

                        let EmailTemplate = emailTemplates.EmailTemplate
                        // __dirnameを使うとテンプレートを取得できないので注意
                        // http://stackoverflow.com/questions/38173996/azure-and-node-js-dirname
                        let dir: string;
                        let title_ja: string;
                        let title_en: string;
                        switch (cue.get('template')) {
                            case ReservationEmailCueUtil.TEMPLATE_COMPLETE:
                                // 1.5次販売はメールテンプレート別
                                if (reservations[0].get('pre_customer')) {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/complete4preCustomer`;
                                    title_ja = '東京タワーチケット 購入完了のお知らせ';
                                    title_en = 'Notice of Completion of TTTS Ticket Purchase';
                                } else {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/complete`;
                                    title_ja = '東京タワーチケット 購入完了のお知らせ';
                                    title_en = 'Notice of Completion of TTTS Ticket Purchase';
                                }

                                break;
                            case ReservationEmailCueUtil.TEMPLATE_TEMPORARY:
                                // 1.5次販売はメールテンプレート別
                                if (reservations[0].get('pre_customer')) {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement4preCustomer`;
                                    title_ja = '東京タワーチケット 仮予約完了のお知らせ';
                                    title_en = 'Notice of Completion of Tentative Reservation for TTTS Tickets';
                                } else {
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
                            GMOUtil: GMOUtil,
                            ReservationUtil: ReservationUtil
                        };

                        _logger.info('rendering template...dir:', dir);
                        template.render(locals, (err, result) => {
                            _logger.info('email template rendered.', err);
                            if (err) return this.next(new Error('failed in rendering an email.'), cue, _logger, cb);

                            let mail = new sendgrid.mail.Mail(
                                new sendgrid.mail.Email(conf.get<string>('email.from'), conf.get<string>('email.fromname')),
                                `[QRコード付き]${title_ja} [QR CODE TICKET]${title_en}`, // TODO 成り行き上、仮完了にもQRコード付き、と入ってしまったので、直すこと
                                new sendgrid.mail.Email(to),
                                new sendgrid.mail.Content("text/html", result.html)
                            );

                            // 完了の場合、QRコードを添付
                            if (cue.get('template') === ReservationEmailCueUtil.TEMPLATE_COMPLETE) {
                                // add barcodes
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

                            // add logo
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
                    }
                    );
                });
            });
    }

    /**
     * メール送信トライ後の処理
     * 
     * @param {Error} err
     * @param {mongoose.Document} cue
     * @param {log4js.Logger} logger
     * @param {Function} cb
     */
    private next(err: Error | null, cue: mongoose.Document, logger: log4js.Logger, cb: () => void): void {
        if (!cue) return cb();

        let status = (err) ? ReservationEmailCueUtil.STATUS_UNSENT : ReservationEmailCueUtil.STATUS_SENT;

        // 送信済みフラグを立てる
        logger.info('setting status...', status);
        cue.set('status', status);
        cue.save((err, res) => {
            logger.info('cue saved.', err, res);
            cb();
        });
    }
}
