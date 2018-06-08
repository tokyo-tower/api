/**
 * 予約ルーター
 * @namespace routes.reservations
 */

import * as ttts from '@motionpicture/ttts-domain';
import * as conf from 'config';
import * as createDebug from 'debug';
import * as express from 'express';
import { INTERNAL_SERVER_ERROR, NO_CONTENT } from 'http-status';
import * as moment from 'moment';
import * as _ from 'underscore';

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import validator from '../middlewares/validator';

const debug = createDebug('ttts-api:routes:reservations');
const reservationsRouter = express.Router();

const reservationRepo = new ttts.repository.Reservation(ttts.mongoose.connection);
const paymentMethodsForCustomer = conf.get('paymentMethodsForCustomer');
const paymentMethodsForStaff = conf.get('paymentMethodsForStaff');

reservationsRouter.use(authentication);

/**
 * 予約を検索
 */
reservationsRouter.get(
    '/pagination',
    permitScopes(['reservations.read-only']),
    validator,
    //tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            const POS_CLIENT_ID = process.env.POS_CLIENT_ID;

            // バリデーション
            const errors: any = {};

            // 片方入力エラーチェック
            if (!isInputEven(req.query.start_hour1, req.query.start_minute1)) {
                errors.start_hour1 = { msg: '時分Fromが片方しか指定されていません' };
            }
            if (!isInputEven(req.query.start_hour2, req.query.start_minute2)) {
                errors.start_hour2 = { msg: '時分Toが片方しか指定されていません' };
            }

            if (Object.keys(errors).length > 0) {
                res.json({
                    success: false,
                    results: null,
                    count: 0,
                    errors: errors
                });

                return;
            }

            // tslint:disable-next-line:no-magic-numbers
            const limit: number = (!_.isEmpty(req.query.limit)) ? parseInt(req.query.limit, 10) : 10;
            // tslint:disable-next-line:no-magic-numbers
            const page: number = (!_.isEmpty(req.query.page)) ? parseInt(req.query.page, 10) : 1;
            // ご来塔日時
            const day: string | null = (!_.isEmpty(req.query.day)) ? req.query.day : null;
            const startHour1: string | null = (!_.isEmpty(req.query.start_hour1)) ? req.query.start_hour1 : null;
            const startMinute1: string | null = (!_.isEmpty(req.query.start_minute1)) ? req.query.start_minute1 : null;
            const startHour2: string | null = (!_.isEmpty(req.query.start_hour2)) ? req.query.start_hour2 : null;
            const startMinute2: string | null = (!_.isEmpty(req.query.start_minute2)) ? req.query.start_minute2 : null;
            // 購入番号
            let paymentNo: string | null = (!_.isEmpty(req.query.payment_no)) ? req.query.payment_no : null;
            // アカウント
            const owner: string | null = (!_.isEmpty(req.query.owner)) ? req.query.owner : null;
            // 予約方法
            const purchaserGroup: string | null = (!_.isEmpty(req.query.purchaser_group)) ? req.query.purchaser_group : null;
            // 決済手段
            const paymentMethod: string | null = (!_.isEmpty(req.query.payment_method)) ? req.query.payment_method : null;
            // 名前
            const purchaserLastName: string | null = (!_.isEmpty(req.query.purchaser_last_name)) ? req.query.purchaser_last_name : null;
            const purchaserFirstName: string | null = (!_.isEmpty(req.query.purchaser_first_name)) ? req.query.purchaser_first_name : null;
            // メアド
            const purchaserEmail: string | null = (!_.isEmpty(req.query.purchaser_email)) ? req.query.purchaser_email : null;
            // 電話番号
            const purchaserTel: string | null = (!_.isEmpty(req.query.purchaser_tel)) ? req.query.purchaser_tel : null;
            // メモ
            const watcherName: string | null = (!_.isEmpty(req.query.watcher_name)) ? req.query.watcher_name : null;

            // 検索条件を作成
            const conditions: any[] = [];

            // 管理者の場合、内部関係者の予約全て&確保中
            conditions.push(
                {
                    status: ttts.factory.reservationStatusType.ReservationConfirmed
                }
            );

            // 来塔日
            if (day !== null) {
                conditions.push({ performance_day: day });
            }
            // 開始時間
            const startTimeFrom: any = (startHour1 !== null && startMinute1 !== null) ? startHour1 + startMinute1 : null;
            const startTimeTo: any = (startHour2 !== null && startMinute2 !== null) ? startHour2 + startMinute2 : null;
            if (startTimeFrom !== null || startTimeTo !== null) {
                const conditionsTime: any = {};
                // 開始時間From
                if (startTimeFrom !== null) {
                    conditionsTime.$gte = startTimeFrom;
                }
                // 開始時間To
                if (startTimeTo !== null) {
                    conditionsTime.$lte = startTimeTo;
                }
                conditions.push({ performance_start_time: conditionsTime });
            }
            // 購入番号
            if (paymentNo !== null) {
                // remove space characters
                paymentNo = ttts.CommonUtil.toHalfWidth(paymentNo.replace(/\s/g, ''));
                conditions.push({ payment_no: { $regex: `${paymentNo}` } });
            }
            // アカウント
            if (owner !== null) {
                conditions.push({ owner_username: owner });
            }
            // 予約方法
            if (purchaserGroup !== null) {
                switch (purchaserGroup) {
                    case 'POS':
                        // 取引エージェントがPOS
                        conditions.push({ 'transaction_agent.id': POS_CLIENT_ID });
                        break;

                    case ttts.factory.person.Group.Customer:
                        // 購入者区分が一般、かつ、POS購入でない
                        conditions.push({ purchaser_group: purchaserGroup });
                        conditions.push({ 'transaction_agent.id': { $ne: POS_CLIENT_ID } });
                        break;

                    default:
                        conditions.push({ purchaser_group: purchaserGroup });
                }
            }
            // 決済手段
            if (paymentMethod !== null) {
                conditions.push({ payment_method: paymentMethod });
            }
            // 名前
            if (purchaserLastName !== null) {
                conditions.push({ purchaser_last_name: new RegExp(purchaserLastName, 'i') }); // 大文字小文字区別しない
            }
            if (purchaserFirstName !== null) {
                conditions.push({ purchaser_first_name: new RegExp(purchaserFirstName, 'i') }); // 大文字小文字区別しない
            }
            // メアド
            if (purchaserEmail !== null) {
                conditions.push({ purchaser_email: purchaserEmail });
            }
            // 電話番号
            if (purchaserTel !== null) {
                conditions.push({ purchaser_tel: new RegExp(`${purchaserTel}$`) });
            }
            // メモ
            if (watcherName !== null) {
                conditions.push({ watcher_name: new RegExp(watcherName, 'i') }); // 大文字小文字区別しない
            }

            debug('searching reservations...', conditions);
            try {
                // 総数検索
                const count = await reservationRepo.reservationModel.count(
                    {
                        $and: conditions
                    }
                ).exec();
                debug('reservation count:', count);

                // データ検索(検索→ソート→指定ページ分切取り)
                const reservations = await reservationRepo.reservationModel.find({ $and: conditions })
                    .sort({
                        performance_day: 1,
                        performance_start_time: 1,
                        payment_no: 1,
                        ticket_type: 1
                    })
                    .skip(limit * (page - 1))
                    .limit(limit)
                    .exec()
                    .then((docs) => docs.map((doc) => <ttts.factory.reservation.event.IReservation>doc.toObject()));

                // 0件メッセージセット
                const message: string = (reservations.length === 0) ?
                    '検索結果がありません。予約データが存在しないか、検索条件を見直してください' : '';

                const getPaymentMethodName = (method: string) => {
                    if (paymentMethodsForCustomer.hasOwnProperty(method)) {
                        return (<any>paymentMethodsForCustomer)[method];
                    }
                    if (paymentMethodsForStaff.hasOwnProperty(method)) {
                        return (<any>paymentMethodsForStaff)[method];
                    }

                    return method;
                };
                // 決済手段名称追加
                for (const reservation of reservations) {
                    (<any>reservation).payment_method_name = getPaymentMethodName(reservation.payment_method);
                }

                res.json({
                    results: reservations,
                    count: count,
                    errors: null,
                    message: message
                });
            } catch (error) {
                res.status(INTERNAL_SERVER_ERROR).json({
                    errors: [{
                        message: error.message
                    }]
                });
            }
        } catch (error) {
            next(error);
        }
    }
);

/**
 * IDで予約取得
 */
reservationsRouter.get(
    '/:id',
    permitScopes(['reservations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            // 予約を検索
            debug('searching reservation by id...', req.params.id);
            const reservation = await reservationRepo.reservationModel.findById(req.params.id)
                .exec().then((doc) => {
                    if (doc === null) {
                        throw new ttts.factory.errors.NotFound('reservations');
                    }

                    return <ttts.factory.reservation.event.IReservation>doc.toObject();
                });

            res.json(reservation);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 予約検索
 */
reservationsRouter.get(
    '',
    permitScopes(['reservations.read-only']),
    validator,
    async (req, res, next) => {
        try {
            // 予約検索条件
            const conditions: any[] = [];

            if (!_.isEmpty(req.query.status)) {
                conditions.push({ status: req.query.status });
            }
            if (!_.isEmpty(req.query.performanceId)) {
                conditions.push({ performance: req.query.performanceId });
            }
            if (!_.isEmpty(req.query.performanceStartFrom)) {
                conditions.push({ performance_start_date: { $gte: moment(req.query.performanceStartFrom).toDate() } });
            }
            if (!_.isEmpty(req.query.performanceStartThrough)) {
                conditions.push({ performance_start_date: { $lte: moment(req.query.performanceStartThrough).toDate() } });
            }
            if (!_.isEmpty(req.query.performanceEndFrom)) {
                conditions.push({ performance_end_date: { $gte: moment(req.query.performanceEndFrom).toDate() } });
            }
            if (!_.isEmpty(req.query.performanceEndThrough)) {
                conditions.push({ performance_end_date: { $lte: moment(req.query.performanceEndThrough).toDate() } });
            }

            // 予約を検索
            debug('searching reservations...', conditions);
            const reservations = await reservationRepo.reservationModel.find({ $and: conditions })
                .exec().then((docs) => docs.map((doc) => <ttts.factory.reservation.event.IReservation>doc.toObject()));

            res.json(reservations);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 入場
 */
reservationsRouter.post(
    '/:id/checkins',
    permitScopes(['reservations.checkins']),
    (req, __, next) => {
        req.checkBody('when', 'invalid when').notEmpty().withMessage('when is required').isISO8601();

        next();
    },
    validator,
    async (req, res, next) => {
        try {
            const checkin: ttts.factory.reservation.event.ICheckin = {
                when: moment(req.body.when).toDate(),
                where: req.body.where,
                why: req.body.why,
                how: req.body.how
            };

            const reservation = await reservationRepo.reservationModel.findByIdAndUpdate(
                req.params.id,
                {
                    $push: { checkins: checkin }
                }
            ).exec();

            if (reservation === null) {
                throw new ttts.factory.errors.NotFound('reservations');
            }

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

/**
 * 入場取消
 * 入場日時がid
 */
reservationsRouter.delete(
    '/:id/checkins/:when',
    permitScopes(['reservations.checkins']),
    validator,
    async (req, res, next) => {
        try {
            const reservation = await reservationRepo.reservationModel.findByIdAndUpdate(
                req.params.id,
                {
                    $pull: { checkins: { when: req.params.when } }
                },
                { new: true }
            ).exec();

            if (reservation === null) {
                throw new ttts.factory.errors.NotFound('reservations');
            }

            res.status(NO_CONTENT).end();
        } catch (error) {
            next(error);
        }
    }
);

export default reservationsRouter;

/**
 * 両方入力チェック(両方入力、または両方未入力の時true)
 *
 * @param {string} value1
 * @param {string} value2
 * @return {boolean}
 */
function isInputEven(value1: string, value2: string): boolean {
    if (_.isEmpty(value1) && _.isEmpty(value2)) {
        return true;
    }
    if (!_.isEmpty(value1) && !_.isEmpty(value2)) {
        return true;
    }

    return false;
}
