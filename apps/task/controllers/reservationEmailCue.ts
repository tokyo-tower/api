/**
 * 予約メールタスクコントローラー
 *
 * @namespace task/ReservationEmailCueController
 */

import { Models } from '@motionpicture/chevre-domain';
import { ReservationUtil } from '@motionpicture/chevre-domain';
import { ReservationEmailCueUtil } from '@motionpicture/chevre-domain';
import * as GMOUtil from '../../../common/Util/GMO/GMOUtil';
import * as Util from '../../../common/Util/Util';

import * as conf from 'config';
import * as emailTemplates from 'email-templates';
import * as fs from 'fs-extra';
import * as log4js from 'log4js';
import * as moment from 'moment';
import * as mongoose from 'mongoose';
import * as numeral from 'numeral';
import * as qr from 'qr-image';
import * as sendgrid from 'sendgrid';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

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
export function watch(): void {
    mongoose.connect(MONGOLAB_URI);
    let count = 0;

    const INTERVAL_MILLISECONDS = 500;
    const MAX_NUMBER_OF_PARALLEL_TASK = 10;
    setInterval(
        () => {
            if (count > MAX_NUMBER_OF_PARALLEL_TASK) return;

            count += 1;
            sendOne(() => {
                count -= 1;
            });
        },
        INTERVAL_MILLISECONDS
    );
}

/**
 * 予約完了メールを送信する
 *
 * @memberOf task/ReservationEmailCueController
 */
export function sendOne(cb: () => void): void {
    logger.info('finding reservationEmailCue...');
    Models.ReservationEmailCue.findOneAndUpdate(
        {
            status: ReservationEmailCueUtil.STATUS_UNSENT
        },
        {
            status: ReservationEmailCueUtil.STATUS_SENDING
        },
        { new: true },
        (err, cue) => {
            logger.info('reservationEmailCue found.', err, cue);
            if (err) return next(err, cue, logger, cb);
            if (!cue) return next(null, cue, logger, cb);

            // 予約ロガーを取得
            Util.getReservationLogger(cue.get('payment_no'), (getReservationLoggerErr, loggerOfReservation) => {
                if (getReservationLoggerErr) return next(getReservationLoggerErr, cue, logger, cb);

                Models.Reservation.find(
                    {
                        payment_no: cue.get('payment_no')
                        // tslint:disable-next-line:max-func-body-length
                    },
                    // tslint:disable-next-line:max-func-body-length
                    (findReservationErr, reservations) => {
                        loggerOfReservation.info('reservations for email found.', findReservationErr, reservations.length);
                        if (findReservationErr) return next(findReservationErr, cue, loggerOfReservation, cb);
                        if (reservations.length === 0) return next(null, cue, loggerOfReservation, cb);

                        let to = '';
                        switch (reservations[0].get('purchaser_group')) {
                            case ReservationUtil.PURCHASER_GROUP_STAFF:
                                to = reservations[0].get('staff_email');
                                break;

                            default:
                                to = reservations[0].get('purchaser_email');
                                break;
                        }

                        loggerOfReservation.info('to is', to);
                        if (!to) return next(null, cue, loggerOfReservation, cb);

                        const EmailTemplate = emailTemplates.EmailTemplate;
                        // __dirnameを使うとテンプレートを取得できないので注意
                        // http://stackoverflow.com/questions/38173996/azure-and-node-js-dirname
                        let dir: string;
                        let titleJa: string;
                        let titleEn: string;
                        switch (cue.get('template')) {
                            case ReservationEmailCueUtil.TEMPLATE_COMPLETE:
                                // 1.5次販売はメールテンプレート別
                                if (reservations[0].get('pre_customer')) {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/complete4preCustomer`;
                                    titleJa = 'CHEVRE_EVENT_NAMEチケット 購入完了のお知らせ';
                                    titleEn = 'Notice of Completion of CHEVRE Ticket Purchase';
                                } else {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/complete`;
                                    titleJa = 'CHEVRE_EVENT_NAMEチケット 購入完了のお知らせ';
                                    titleEn = 'Notice of Completion of CHEVRE Ticket Purchase';
                                }

                                break;
                            case ReservationEmailCueUtil.TEMPLATE_TEMPORARY:
                                // 1.5次販売はメールテンプレート別
                                if (reservations[0].get('pre_customer')) {
                                    dir = `${process.cwd()}/apps/task/views/email/reserve/waitingSettlement4preCustomer`;
                                    titleJa = 'CHEVRE_EVENT_NAMEチケット 仮予約完了のお知らせ';
                                    titleEn = 'Notice of Completion of Tentative Reservation for CHEVRE Tickets';
                                } else {
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
                            ReservationUtil: ReservationUtil
                        };

                        loggerOfReservation.info('rendering template...dir:', dir);
                        template.render(locals, (renderErr, result) => {
                            loggerOfReservation.info('email template rendered.', renderErr);
                            if (renderErr) return next(new Error('failed in rendering an email.'), cue, loggerOfReservation, cb);

                            const mail = new sendgrid.mail.Mail(
                                new sendgrid.mail.Email(conf.get<string>('email.from'), conf.get<string>('email.fromname')),
                                `[QRコード付き]${titleJa} [QR CODE TICKET]${titleEn}`, // TODO 成り行き上、仮完了にもQRコード付き、と入ってしまったので、直すこと
                                new sendgrid.mail.Email(to),
                                new sendgrid.mail.Content('text/html', result.html)
                            );

                            // 完了の場合、QRコードを添付
                            if (cue.get('template') === ReservationEmailCueUtil.TEMPLATE_COMPLETE) {
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
                            sg.API(request).then(
                                (response) => {
                                    loggerOfReservation.info('an email sent.', response);
                                    next(null, cue, loggerOfReservation, cb);
                                },
                                (sendErr) => {
                                    next(sendErr, cue, loggerOfReservation, cb);
                                }
                            );
                        });
                    }
                );
            });
        }
    );
}

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
function next(err: Error | null, cue: mongoose.Document, localLogger: log4js.Logger, cb: () => void): void {
    if (!cue) return cb();

    const status = (err) ? ReservationEmailCueUtil.STATUS_UNSENT : ReservationEmailCueUtil.STATUS_SENT;

    // 送信済みフラグを立てる
    localLogger.info('setting status...', status);
    cue.set('status', status);
    cue.save((saveErr, res) => {
        localLogger.info('cue saved.', saveErr, res);
        cb();
    });
}
