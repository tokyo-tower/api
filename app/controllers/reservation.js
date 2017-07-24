"use strict";
/**
 * 座席予約コントローラー
 *
 * @namespace controllers/reservation
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const createDebug = require("debug");
const http_status_1 = require("http-status");
const moment = require("moment");
const sendgrid = require("sendgrid");
// import * as validator from 'validator';
const debug = createDebug('ttts-api:controllers:reservation');
/**
 * 予約情報メールを送信する
 *
 * @memberof controllers/reservation
 */
function transfer(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const id = req.params.id;
            const to = req.body.to;
            const reservation = yield ttts.Models.Reservation.findOne({ _id: id, status: ttts.ReservationUtil.STATUS_RESERVED }).exec();
            if (reservation === null) {
                res.status(http_status_1.NOT_FOUND);
                res.json({
                    data: null
                });
                return;
            }
            const titleJa = `${reservation.get('purchaser_name').ja}様よりTTTS_EVENT_NAMEのチケットが届いております`;
            // tslint:disable-next-line:max-line-length
            const titleEn = `This is a notification that you have been invited to Tokyo International Film Festival by Mr./Ms. ${reservation.get('purchaser_name').en}.`;
            res.render('email/resevation', {
                layout: false,
                reservations: [reservation],
                to: to,
                moment: moment,
                titleJa: titleJa,
                titleEn: titleEn,
                ReservationUtil: ttts.ReservationUtil
            }, (renderErr, text) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (renderErr instanceof Error) {
                        throw renderErr;
                    }
                    const mail = new sendgrid.mail.Mail(new sendgrid.mail.Email(process.env.EMAIL_FROM_ADDRESS, process.env.EMAIL_FROM_NAME), `${titleJa} ${titleEn}`, new sendgrid.mail.Email(to), new sendgrid.mail.Content('text/plain', text));
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
                    yield sg.API(request);
                    res.status(http_status_1.NO_CONTENT).end();
                }
                catch (error) {
                    console.error('an email unsent.', error);
                    next(error);
                }
            }));
        }
        catch (error) {
            next(error);
        }
    });
}
exports.transfer = transfer;
/**
 * 入場履歴を追加する
 *
 * @memberof controllers/reservation
 */
function checkin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const reservation = yield ttts.Models.Reservation.findByIdAndUpdate(req.params.id, {
                $push: {
                    checkins: {
                        when: moment().toDate(),
                        where: req.body.where,
                        why: req.body.why,
                        how: req.body.how // どうやって
                    }
                }
            }).exec();
            if (reservation === null) {
                res.status(http_status_1.NOT_FOUND).json({
                    data: null
                });
            }
            else {
                res.status(http_status_1.NO_CONTENT).end();
            }
        }
        catch (error) {
            next(error);
        }
    });
}
exports.checkin = checkin;
function cancel(performanceDay, paymentNo) {
    return __awaiter(this, void 0, void 0, function* () {
        // 該当予約を検索
        const reservationIds = yield ttts.Models.Reservation.distinct('_id', {
            performance_day: performanceDay,
            payment_no: paymentNo,
            status: ttts.ReservationUtil.STATUS_RESERVED
        }).exec().then((ids) => ids.map((id) => id.toString()));
        debug('canceling reservations...', performanceDay, paymentNo, reservationIds);
        return yield Promise.all(reservationIds.map((id) => __awaiter(this, void 0, void 0, function* () {
            const canceledReservation = yield ttts.Models.Reservation.findByIdAndUpdate(id, {
                $set: { status: ttts.ReservationUtil.STATUS_AVAILABLE },
                $unset: { payment_no: 1, ticket_type: 1, expired_at: 1 }
            }).exec();
            return canceledReservation.get('id');
        })));
    });
}
exports.cancel = cancel;
