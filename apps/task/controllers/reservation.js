/**
 * 座席予約タスクコントローラー
 *
 * @namespace task/ReservationController
 */
"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const chevre_domain_2 = require("@motionpicture/chevre-domain");
const GMOUtil = require("../../../common/Util/GMO/GMOUtil");
const conf = require("config");
const log4js = require("log4js");
const moment = require("moment");
const mongoose = require("mongoose");
const querystring = require("querystring");
const request = require("request");
const MONGOLAB_URI = process.env.MONGOLAB_URI;
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
 * 仮予約ステータスで、一定時間過ぎた予約を空席にする
 *
 * @memberOf task/ReservationController
 */
function removeTmps() {
    mongoose.connect(MONGOLAB_URI, {});
    const BUFFER_PERIOD_SECONDS = 60;
    logger.info('removing temporary reservations...');
    chevre_domain_1.Models.Reservation.remove({
        status: chevre_domain_2.ReservationUtil.STATUS_TEMPORARY,
        expired_at: {
            // 念のため、仮予約有効期間より1分長めにしておく
            $lt: moment().add(-BUFFER_PERIOD_SECONDS, 'seconds').toISOString()
        }
    }, (err) => {
        logger.info('temporary reservations removed.', err);
        // 失敗しても、次のタスクにまかせる(気にしない)
        // if (err) {
        // }
        mongoose.disconnect();
        process.exit(0);
    });
}
exports.removeTmps = removeTmps;
/**
 * CHEVRE確保上の仮予約をCHEVRE確保へ戻す
 *
 * @memberOf task/ReservationController
 */
function tmp2tiff() {
    mongoose.connect(MONGOLAB_URI, {});
    const BUFFER_PERIOD_SECONDS = 60;
    chevre_domain_1.Models.Reservation.distinct('_id', {
        status: chevre_domain_2.ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_CHEVRE,
        expired_at: {
            // 念のため、仮予約有効期間より1分長めにしておく
            $lt: moment().add(-BUFFER_PERIOD_SECONDS, 'seconds').toISOString()
        }
    }, (err, ids) => {
        if (err) {
            mongoose.disconnect();
            process.exit(0);
        }
        const promises = ids.map((id) => {
            return new Promise((resolve, reject) => {
                logger.info('updating to STATUS_KEPT_BY_CHEVRE...id:', id);
                chevre_domain_1.Models.Reservation.findOneAndUpdate({ _id: id }, { status: chevre_domain_2.ReservationUtil.STATUS_KEPT_BY_CHEVRE }, { new: true }, (updateErr, reservation) => {
                    logger.info('updated to STATUS_KEPT_BY_CHEVRE. id:', id, updateErr, reservation);
                    (updateErr) ? reject(updateErr) : resolve();
                });
            });
        });
        Promise.all(promises).then(() => {
            mongoose.disconnect();
            process.exit(0);
        }, () => {
            // 失敗しても、次のタスクにまかせる(気にしない)
            mongoose.disconnect();
            process.exit(0);
        });
    });
}
exports.tmp2tiff = tmp2tiff;
/**
 * 固定日時を経過したら、空席ステータスにするバッチ
 *
 * @memberOf task/ReservationController
 */
// tslint:disable-next-line:max-func-body-length
function releaseSeatsKeptByMembers() {
    if (moment(conf.get('datetimes.reservation_end_members')) < moment()) {
        mongoose.connect(MONGOLAB_URI);
        // 内部関係者で確保する
        chevre_domain_1.Models.Staff.findOne({
            user_id: '2016sagyo2'
        }, 
        // tslint:disable-next-line:max-func-body-length
        (err, staff) => {
            logger.info('staff found.', err, staff);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            // 購入番号発行
            chevre_domain_2.ReservationUtil.publishPaymentNo((publishErr, paymentNo) => {
                logger.info('paymentNo is', paymentNo);
                if (publishErr) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                chevre_domain_1.Models.Reservation.find({
                    status: chevre_domain_2.ReservationUtil.STATUS_KEPT_BY_MEMBER
                }, (findReservationErr, reservations) => {
                    if (findReservationErr) {
                        mongoose.disconnect();
                        process.exit(0);
                        return;
                    }
                    const promises = reservations.map((reservation, index) => {
                        return new Promise((resolve, reject) => {
                            logger.info('finding performance...');
                            chevre_domain_1.Models.Performance.findOne({
                                _id: reservation.get('performance')
                            })
                                .populate('film', 'name is_mx4d copyright')
                                .populate('screen', 'name')
                                .populate('theater', 'name address')
                                .exec((findPerformanceErr, performance) => {
                                if (findPerformanceErr)
                                    return reject(findPerformanceErr);
                                logger.info('updating reservation...');
                                reservation.update({
                                    status: chevre_domain_2.ReservationUtil.STATUS_RESERVED,
                                    staff: staff.get('_id'),
                                    staff_user_id: staff.get('user_id'),
                                    staff_email: staff.get('email'),
                                    staff_name: staff.get('name'),
                                    staff_signature: 'system',
                                    entered: false,
                                    updated_user: 'system',
                                    purchased_at: Date.now(),
                                    watcher_name_updated_at: null,
                                    watcher_name: '',
                                    film_copyright: performance.get('film').get('copyright'),
                                    film_is_mx4d: performance.get('film').get('is_mx4d'),
                                    film_image: `${process.env.FRONTEND_ENDPOINT}/images/film/${performance.get('film').get('_id')}.jpg`,
                                    film_name_en: performance.get('film').get('name.en'),
                                    film_name_ja: performance.get('film').get('name.ja'),
                                    film: performance.get('film').get('_id'),
                                    screen_name_en: performance.get('screen').get('name.en'),
                                    screen_name_ja: performance.get('screen').get('name.ja'),
                                    screen: performance.get('screen').get('_id'),
                                    theater_name_en: performance.get('theater').get('name.en'),
                                    theater_name_ja: performance.get('theater').get('name.ja'),
                                    theater_address_en: performance.get('theater').get('address.en'),
                                    theater_address_ja: performance.get('theater').get('address.ja'),
                                    theater: performance.get('theater').get('_id'),
                                    performance_canceled: performance.get('canceled'),
                                    performance_end_time: performance.get('end_time'),
                                    performance_start_time: performance.get('start_time'),
                                    performance_open_time: performance.get('open_time'),
                                    performance_day: performance.get('day'),
                                    purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF,
                                    payment_no: paymentNo,
                                    payment_seat_index: index,
                                    charge: 0,
                                    ticket_type_charge: 0,
                                    ticket_type_name_en: 'Free',
                                    ticket_type_name_ja: '無料',
                                    ticket_type_code: '00',
                                    seat_grade_additional_charge: 0,
                                    seat_grade_name_en: 'Normal Seat',
                                    seat_grade_name_ja: 'ノーマルシート'
                                }, (updateErr, raw) => {
                                    logger.info('reservation updated.', updateErr, raw);
                                    (updateErr) ? reject(updateErr) : resolve();
                                });
                            });
                        });
                    });
                    Promise.all(promises)
                        .then(() => {
                        logger.info('promised.', err);
                        mongoose.disconnect();
                        process.exit(0);
                    })
                        .catch((promiseErr) => {
                        logger.info('promised.', promiseErr);
                        mongoose.disconnect();
                        process.exit(0);
                    });
                });
            });
        });
    }
    else {
        process.exit(0);
    }
}
exports.releaseSeatsKeptByMembers = releaseSeatsKeptByMembers;
/**
 * GMO離脱データを解放する(内部確保)
 *
 * @memberOf task/ReservationController
 */
// tslint:disable-next-line:max-func-body-length
function releaseGarbages() {
    mongoose.connect(MONGOLAB_URI);
    // 一定期間WAITING_SETTLEMENTの予約を抽出
    const WAITING_PERIOD_HOURS = 2;
    chevre_domain_1.Models.Reservation.find({
        status: chevre_domain_2.ReservationUtil.STATUS_WAITING_SETTLEMENT,
        updated_at: { $lt: moment().add(-WAITING_PERIOD_HOURS, 'hours').toISOString() }
    }, 
    // tslint:disable-next-line:max-func-body-length
    (err, reservations) => {
        logger.info('reservations found.', err, reservations);
        if (err) {
            mongoose.disconnect();
            process.exit(0);
            return;
        }
        const paymentNos4release = [];
        const gmoUrl = (process.env.NODE_ENV === 'production') ? 'https://p01.mul-pay.jp/payment/SearchTradeMulti.idPass' : 'https://pt01.mul-pay.jp/payment/SearchTradeMulti.idPass';
        const promises = reservations.map((reservation) => {
            return new Promise((resolve, reject) => {
                // GMO取引状態参照
                logger.info('requesting... ');
                request.post({
                    url: gmoUrl,
                    form: {
                        ShopID: conf.get('gmo_payment_shop_id'),
                        ShopPass: conf.get('gmo_payment_shop_password'),
                        OrderID: reservation.get('payment_no'),
                        PayType: reservation.get('payment_method')
                    }
                }, (error, response, body) => {
                    const STATUS_CODE_OK = 200;
                    logger.info('request processed.', error);
                    if (error)
                        return reject(error);
                    if (response.statusCode !== STATUS_CODE_OK)
                        return reject(new Error(`statusCode is ${response.statusCode}`));
                    const searchTradeResult = querystring.parse(body);
                    // GMOにない、あるいは、UNPROCESSEDであれば離脱データ
                    if (searchTradeResult.ErrCode) {
                        // M01-M01004002
                        // 指定されたオーダーIDの取引は登録されていません。
                        if (searchTradeResult.ErrCode === 'M01' && searchTradeResult.ErrInfo === 'M01004002') {
                            paymentNos4release.push(reservation.get('payment_no'));
                        }
                        resolve();
                    }
                    else {
                        if (searchTradeResult.Status === GMOUtil.STATUS_CVS_UNPROCESSED || searchTradeResult.Status === GMOUtil.STATUS_CREDIT_UNPROCESSED) {
                            paymentNos4release.push(reservation.get('payment_no'));
                        }
                        resolve();
                    }
                });
            });
        });
        Promise.all(promises).then(() => {
            logger.info('promised.');
            if (paymentNos4release.length === 0) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            // 内部で確保する仕様の場合
            chevre_domain_1.Models.Staff.findOne({
                user_id: '2016sagyo2'
            }, (findStaffErr, staff) => {
                logger.info('staff found.', findStaffErr, staff);
                if (findStaffErr) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                logger.info('updating reservations...');
                chevre_domain_1.Models.Reservation.update({
                    payment_no: { $in: paymentNos4release }
                }, {
                    status: chevre_domain_2.ReservationUtil.STATUS_RESERVED,
                    purchaser_group: chevre_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF,
                    charge: 0,
                    ticket_type_charge: 0,
                    ticket_type_name_en: 'Free',
                    ticket_type_name_ja: '無料',
                    ticket_type_code: '00',
                    staff: staff.get('_id'),
                    staff_user_id: staff.get('user_id'),
                    staff_email: staff.get('email'),
                    staff_name: staff.get('name'),
                    staff_signature: 'system',
                    updated_user: 'system',
                    // "purchased_at": Date.now(), // 購入日更新しない
                    watcher_name_updated_at: null,
                    watcher_name: ''
                }, {
                    multi: true
                }, (updateErr, raw) => {
                    logger.info('updated.', updateErr, raw);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        }).catch((promiseErr) => {
            logger.info('promised.', promiseErr);
            mongoose.disconnect();
            process.exit(0);
        });
    });
}
exports.releaseGarbages = releaseGarbages;
