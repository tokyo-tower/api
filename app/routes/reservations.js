"use strict";
/**
 * 予約ルーター
 *
 * @module routes/reservations
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
const express = require("express");
const httpStatus = require("http-status");
const moment = require("moment");
const sendgrid = require("sendgrid");
const reservationRouter = express.Router();
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const ReservationController = require("../controllers/reservation");
reservationRouter.use(authentication_1.default);
/**
 * 予約メール転送
 */
reservationRouter.post('/:id/transfer', permitScopes_1.default(['reservations', 'reservations.read-only']), (req, __, next) => {
    // メールアドレスの有効性チェック
    req.checkBody('to', 'invalid to')
        .isEmail().withMessage(req.__('Message.invalid{{fieldName}}', { fieldName: req.__('Form.FieldName.email') }));
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        yield ReservationController.findById(req.params.id).then((reservationDoc) => {
            if (reservationDoc === null) {
                // 予約がなければ404
                res.status(httpStatus.NOT_FOUND).json({
                    data: null
                });
            }
            else {
                const titleJa = `${reservationDoc.get('purchaser_name').ja}様よりTTTS_EVENT_NAMEのチケットが届いております`;
                // tslint:disable-next-line:max-line-length
                const titleEn = `This is a notification that you have been invited to Tokyo International Film Festival by Mr./Ms. ${reservationDoc.get('purchaser_name').en}.`;
                res.render('email/resevation', {
                    layout: false,
                    reservations: [reservationDoc],
                    to: req.body.to,
                    moment: moment,
                    titleJa: titleJa,
                    titleEn: titleEn,
                    ReservationUtil: ttts.ReservationUtil
                }, (renderErr, text) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        if (renderErr instanceof Error) {
                            throw renderErr;
                        }
                        const mail = new sendgrid.mail.Mail(new sendgrid.mail.Email(process.env.EMAIL_FROM_ADDRESS, process.env.EMAIL_FROM_NAME), `${titleJa} ${titleEn}`, new sendgrid.mail.Email(req.body.to), new sendgrid.mail.Content('text/plain', text));
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
                        res.status(httpStatus.NO_CONTENT).end();
                    }
                    catch (error) {
                        next(error);
                    }
                }));
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 入場
 */
reservationRouter.post('/:id/checkins', permitScopes_1.default(['reservations', 'reservations.checkins']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const checkin = {
            when: moment().toDate(),
            where: req.body.where,
            why: req.body.why,
            how: req.body.how
        };
        yield ReservationController.createCheckin(req.params.id, checkin).then((result) => {
            if (result === null) {
                res.status(httpStatus.NOT_FOUND).json({
                    data: null
                });
            }
            else {
                res.status(httpStatus.NO_CONTENT).end();
            }
        });
    }
    catch (error) {
        next(error);
    }
}));
/**
 * 予約取消
 */
reservationRouter.post('/cancel', permitScopes_1.default(['reservations']), (req, __, next) => {
    req.checkBody('performance_day').notEmpty().withMessage('performance_day is required');
    req.checkBody('payment_no').notEmpty().withMessage('payment_no is required');
    next();
}, validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const canceledReservationIds = yield ReservationController.cancel(req.body.performance_day, req.body.payment_no);
        if (canceledReservationIds.length > 0) {
            res.status(httpStatus.NO_CONTENT).end();
        }
        else {
            res.status(httpStatus.NOT_FOUND).json({
                data: null
            });
        }
    }
    catch (error) {
        next(error);
    }
}));
exports.default = reservationRouter;
