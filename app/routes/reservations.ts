/**
 * 予約ルーター
 *
 * @module routes/reservations
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as express from 'express';
import * as httpStatus from 'http-status';
import * as moment from 'moment';
import * as sendgrid from 'sendgrid';

const reservationRouter = express.Router();

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

import * as ReservationController from '../controllers/reservation';

reservationRouter.use(authentication);

/**
 * 予約メール転送
 */
reservationRouter.post(
    '/:id/transfer',
    permitScopes(['reservations', 'reservations.read-only']),
    (req, __, next) => {
        // メールアドレスの有効性チェック
        req.checkBody('to', 'invalid to')
            .isEmail().withMessage(req.__('Message.invalid{{fieldName}}', { fieldName: req.__('Form.FieldName.email') }));

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            await ReservationController.findById(req.params.id).then((option) => {
                option.match({
                    Some: (reservationDoc) => {

                        const titleJa = `${reservationDoc.get('purchaser_name').ja}様よりTTTS_EVENT_NAMEのチケットが届いております`;
                        // tslint:disable-next-line:max-line-length
                        const titleEn = `This is a notification that you have been invited to Tokyo International Film Festival by Mr./Ms. ${reservationDoc.get('purchaser_name').en}.`;

                        res.render(
                            'email/resevation',
                            {
                                layout: false,
                                reservations: [reservationDoc],
                                to: req.body.to,
                                moment: moment,
                                titleJa: titleJa,
                                titleEn: titleEn,
                                ReservationUtil: ttts.ReservationUtil
                            },
                            async (renderErr, text) => {
                                try {
                                    if (renderErr instanceof Error) {
                                        throw renderErr;
                                    }

                                    const mail = new sendgrid.mail.Mail(
                                        new sendgrid.mail.Email(
                                            <string>process.env.EMAIL_FROM_ADDRESS,
                                            <string>process.env.EMAIL_FROM_NAME
                                        ),
                                        `${titleJa} ${titleEn}`,
                                        new sendgrid.mail.Email(req.body.to),
                                        new sendgrid.mail.Content('text/plain', text)
                                    );

                                    const sg = sendgrid(<string>process.env.SENDGRID_API_KEY);
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

                                    await sg.API(request);

                                    res.status(httpStatus.NO_CONTENT).end();
                                } catch (error) {
                                    next(error);
                                }
                            }
                        );
                    },
                    None: () => {
                        // 予約がなければ404
                        res.status(httpStatus.NOT_FOUND).json({
                            data: null
                        });
                    }
                });
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 入場
 */
reservationRouter.post(
    '/:id/checkins',
    permitScopes(['reservations', 'reservations.checkins']),
    validator,
    async (req, res, next) => {
        try {
            const checkin = {
                when: moment().toDate(),
                where: req.body.where,
                why: req.body.why,
                how: req.body.how
            };

            await ReservationController.createCheckin(req.params.id, checkin).then((option) => {
                option.match({
                    Some: () => {
                        res.status(httpStatus.NO_CONTENT).end();
                    },
                    None: () => {
                        res.status(httpStatus.NOT_FOUND).json({
                            data: null
                        });
                    }
                });
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 予約取消
 */
reservationRouter.post(
    '/cancel',
    permitScopes(['reservations']),
    (req, __, next) => {
        req.checkBody('performance_day').notEmpty().withMessage('performance_day is required');
        req.checkBody('payment_no').notEmpty().withMessage('payment_no is required');

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const canceledReservationIds = await ReservationController.cancel(req.body.performance_day, req.body.payment_no);

            if (canceledReservationIds.length > 0) {
                res.status(httpStatus.NO_CONTENT).end();
            } else {
                res.status(httpStatus.NOT_FOUND).json({
                    data: null
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

export default reservationRouter;
