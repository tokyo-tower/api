"use strict";
/**
 * 座席予約コントローラー
 *
 * @namespace ReservationController
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
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const conf = require("config");
const moment = require("moment");
const sendgrid = require("sendgrid");
const validator = require("validator");
/**
 * 予約情報メールを送信する
 *
 * @memberOf ReservationController
 */
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
            const reservation = yield chevre_domain_1.Models.Reservation.findOne({ _id: id, status: chevre_domain_2.ReservationUtil.STATUS_RESERVED }).exec();
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
            }, (renderErr, text) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (renderErr instanceof Error) {
                        throw renderErr;
                    }
                    const mail = new sendgrid.mail.Mail(new sendgrid.mail.Email(conf.get('email.from'), conf.get('email.fromname')), `${titleJa} ${titleEn}`, new sendgrid.mail.Email(to), new sendgrid.mail.Content('text/plain', text));
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
                    res.json({
                        success: true,
                        message: ''
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
 * 入場履歴を追加する
 *
 * @memberOf ReservationController
 */
function checkin(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield chevre_domain_1.Models.Reservation.findByIdAndUpdate(req.params.id, {
                $push: {
                    checkins: {
                        when: moment().toDate(),
                        where: req.body.where,
                        why: req.body.why,
                        how: req.body.how // どうやって
                    }
                }
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
exports.checkin = checkin;
/**
 * ムビチケユーザーで検索する
 *
 * @memberOf ReservationController
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
 * @memberOf ReservationController
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
