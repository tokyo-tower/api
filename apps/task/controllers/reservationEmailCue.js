/**
 * 予約メールタスクコントローラー
 *
 * @namespace task/ReservationEmailCueController
 */
"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const chevre_domain_3 = require("@motionpicture/chevre-domain");
const GMOUtil = require("../../../common/Util/GMO/GMOUtil");
const Util = require("../../../common/Util/Util");
const conf = require("config");
const emailTemplates = require("email-templates");
const fs = require("fs-extra");
const log4js = require("log4js");
const moment = require("moment");
const mongoose = require("mongoose");
const numeral = require("numeral");
const qr = require("qr-image");
const sendgrid = require("sendgrid");
const MONGOLAB_URI = conf.get('mongolab_uri');
// todo ログ出力方法考える
log4js.configure({
    appenders: [
        {
            category: 'system',
            type: 'console'
        }
    ],
    levels: {
        system: 'ALL'
    },
    replaceConsole: true
});
const logger = log4js.getLogger('system');
/**
 * キューを監視させる
 *
 * @memberOf task/ReservationEmailCueController
 */
function watch() {
    mongoose.connect(MONGOLAB_URI);
    let count = 0;
    const INTERVAL_MILLISECONDS = 500;
    const MAX_NUMBER_OF_PARALLEL_TASK = 10;
    setInterval(() => {
        if (count > MAX_NUMBER_OF_PARALLEL_TASK)
            return;
        count += 1;
        sendOne(() => {
            count -= 1;
        });
    }, INTERVAL_MILLISECONDS);
}
exports.watch = watch;
/**
 * 予約完了メールを送信する
 *
 * @memberOf task/ReservationEmailCueController
 */
function sendOne(cb) {
    logger.info('finding reservationEmailCue...');
    chevre_domain_1.Models.ReservationEmailCue.findOneAndUpdate({
        status: chevre_domain_3.ReservationEmailCueUtil.STATUS_UNSENT
    }, {
        status: chevre_domain_3.ReservationEmailCueUtil.STATUS_SENDING
    }, { new: true }, (err, cue) => {
        logger.info('reservationEmailCue found.', err, cue);
        if (err)
            return next(err, cue, logger, cb);
        if (!cue)
            return next(null, cue, logger, cb);
        // 予約ロガーを取得
        Util.getReservationLogger(cue.get('payment_no'), (getReservationLoggerErr, loggerOfReservation) => {
            if (getReservationLoggerErr)
                return next(getReservationLoggerErr, cue, logger, cb);
            chevre_domain_1.Models.Reservation.find({
                payment_no: cue.get('payment_no')
            }, 
            // tslint:disable-next-line:max-func-body-length
            (findReservationErr, reservations) => {
                loggerOfReservation.info('reservations for email found.', findReservationErr, reservations.length);
                if (findReservationErr)
                    return next(findReservationErr, cue, loggerOfReservation, cb);
                if (reservations.length === 0)
                    return next(null, cue, loggerOfReservation, cb);
                let to = '';
                switch (reservations[0].get('purchaser_group')) {
                    case chevre_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF:
                        to = reservations[0].get('staff_email');
                        break;
                    default:
                        to = reservations[0].get('purchaser_email');
                        break;
                }
                loggerOfReservation.info('to is', to);
                if (!to)
                    return next(null, cue, loggerOfReservation, cb);
                const EmailTemplate = emailTemplates.EmailTemplate;
                // __dirnameを使うとテンプレートを取得できないので注意
                // http://stackoverflow.com/questions/38173996/azure-and-node-js-dirname
                let dir;
                let titleJa;
                let titleEn;
                switch (cue.get('template')) {
                    case chevre_domain_3.ReservationEmailCueUtil.TEMPLATE_COMPLETE:
                        // 1.5次販売はメールテンプレート別
                        if (reservations[0].get('pre_customer')) {
                            dir = `${process.cwd()}/apps/task/views/email/reserve/complete4preCustomer`;
                            titleJa = 'CHEVRE_EVENT_NAMEチケット 購入完了のお知らせ';
                            titleEn = 'Notice of Completion of CHEVRE Ticket Purchase';
                        }
                        else {
                            dir = `${process.cwd()}/apps/task/views/email/reserve/complete`;
                            titleJa = 'CHEVRE_EVENT_NAMEチケット 購入完了のお知らせ';
                            titleEn = 'Notice of Completion of CHEVRE Ticket Purchase';
                        }
                        break;
                    case chevre_domain_3.ReservationEmailCueUtil.TEMPLATE_TEMPORARY:
                        // 1.5次販売はメールテンプレート別
                        if (reservations[0].get('pre_customer')) {
                            dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement4preCustomer`;
                            titleJa = 'CHEVRE_EVENT_NAMEチケット 仮予約完了のお知らせ';
                            titleEn = 'Notice of Completion of Tentative Reservation for CHEVRE Tickets';
                        }
                        else {
                            dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement`;
                            titleJa = 'CHEVRE_EVENT_NAMEチケット 仮予約完了のお知らせ';
                            titleEn = 'Notice of Completion of Tentative Reservation for CHEVRE Tickets';
                        }
                        break;
                    default:
                        return next(new Error(`${cue.get('template')} not implemented.`), cue, loggerOfReservation, cb);
                }
                const template = new EmailTemplate(dir);
                const locals = {
                    title_ja: titleJa,
                    title_en: titleEn,
                    reservations: reservations,
                    moment: moment,
                    numeral: numeral,
                    conf: conf,
                    GMOUtil: GMOUtil,
                    ReservationUtil: chevre_domain_2.ReservationUtil
                };
                loggerOfReservation.info('rendering template...dir:', dir);
                template.render(locals, (renderErr, result) => {
                    loggerOfReservation.info('email template rendered.', renderErr);
                    if (renderErr)
                        return next(new Error('failed in rendering an email.'), cue, loggerOfReservation, cb);
                    const mail = new sendgrid.mail.Mail(new sendgrid.mail.Email(conf.get('email.from'), conf.get('email.fromname')), `[QRコード付き]${titleJa} [QR CODE TICKET]${titleEn}`, // TODO 成り行き上、仮完了にもQRコード付き、と入ってしまったので、直すこと
                    new sendgrid.mail.Email(to), new sendgrid.mail.Content('text/html', result.html));
                    // 完了の場合、QRコードを添付
                    if (cue.get('template') === chevre_domain_3.ReservationEmailCueUtil.TEMPLATE_COMPLETE) {
                        // add barcodes
                        for (const reservation of reservations) {
                            const reservationId = reservation.get('_id').toString();
                            const attachment = new sendgrid.mail.Attachment();
                            attachment.setFilename(`QR_${reservationId}.png`);
                            attachment.setType('image/png');
                            attachment.setContent(qr.imageSync(reservation.get('qr_str'), { type: 'png' }).toString('base64'));
                            attachment.setDisposition('inline');
                            attachment.setContentId(`qrcode_${reservationId}`);
                            mail.addAttachment(attachment);
                        }
                    }
                    // add logo
                    const attachmentLogo = new sendgrid.mail.Attachment();
                    attachmentLogo.setFilename('logo.png');
                    attachmentLogo.setType('image/png');
                    attachmentLogo.setContent(fs.readFileSync(`${__dirname}/../../../public/images/email/logo.png`).toString('base64'));
                    attachmentLogo.setDisposition('inline');
                    attachmentLogo.setContentId('logo');
                    mail.addAttachment(attachmentLogo);
                    loggerOfReservation.info('sending an email...email:', mail);
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
                        loggerOfReservation.info('an email sent.', response);
                        next(null, cue, loggerOfReservation, cb);
                    }, (sendErr) => {
                        next(sendErr, cue, loggerOfReservation, cb);
                    });
                });
            });
        });
    });
}
exports.sendOne = sendOne;
/**
 * メール送信トライ後の処理
 *
 * @param {Error} err
 * @param {mongoose.Document} cue
 * @param {log4js.Logger} localLogger
 * @param {Function} cb
 *
 * @ignore
 */
// tslint:disable-next-line:prefer-function-over-method
function next(err, cue, localLogger, cb) {
    if (!cue)
        return cb();
    const status = (err) ? chevre_domain_3.ReservationEmailCueUtil.STATUS_UNSENT : chevre_domain_3.ReservationEmailCueUtil.STATUS_SENT;
    // 送信済みフラグを立てる
    localLogger.info('setting status...', status);
    cue.set('status', status);
    cue.save((saveErr, res) => {
        localLogger.info('cue saved.', saveErr, res);
        cb();
    });
}
