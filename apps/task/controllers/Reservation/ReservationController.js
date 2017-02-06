"use strict";
const BaseController_1 = require("../BaseController");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const GMOUtil_1 = require("../../../common/Util/GMO/GMOUtil");
const moment = require("moment");
const conf = require("config");
const mongoose = require("mongoose");
const request = require("request");
const querystring = require("querystring");
let MONGOLAB_URI = conf.get('mongolab_uri');
class ReservationController extends BaseController_1.default {
    removeTmps() {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('removing temporary reservations...');
        ttts_domain_1.Models.Reservation.remove({
            status: ttts_domain_2.ReservationUtil.STATUS_TEMPORARY,
            expired_at: {
                $lt: moment().add(-60, 'seconds').toISOString()
            }
        }, (err) => {
            this.logger.info('temporary reservations removed.', err);
            if (err) {
            }
            mongoose.disconnect();
            process.exit(0);
        });
    }
    tmp2tiff() {
        mongoose.connect(MONGOLAB_URI, {});
        ttts_domain_1.Models.Reservation.distinct('_id', {
            status: ttts_domain_2.ReservationUtil.STATUS_TEMPORARY_ON_KEPT_BY_TTTS,
            expired_at: {
                $lt: moment().add(-60, 'seconds').toISOString()
            }
        }, (err, ids) => {
            if (err) {
                mongoose.disconnect();
                process.exit(0);
            }
            let promises = ids.map((id) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('updating to STATUS_KEPT_BY_TTTS...id:', id);
                    ttts_domain_1.Models.Reservation.findOneAndUpdate({ _id: id }, { status: ttts_domain_2.ReservationUtil.STATUS_KEPT_BY_TTTS }, { new: true }, (err, reservation) => {
                        this.logger.info('updated to STATUS_KEPT_BY_TTTS. id:', id, err, reservation);
                        (err) ? reject(err) : resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                mongoose.disconnect();
                process.exit(0);
            }, () => {
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
    releaseSeatsKeptByMembers() {
        if (moment(conf.get('datetimes.reservation_end_members')) < moment()) {
            mongoose.connect(MONGOLAB_URI);
            ttts_domain_1.Models.Staff.findOne({
                user_id: "2016sagyo2"
            }, (err, staff) => {
                this.logger.info('staff found.', err, staff);
                if (err) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                ttts_domain_2.ReservationUtil.publishPaymentNo((err, paymentNo) => {
                    this.logger.info('paymentNo is', paymentNo);
                    if (err) {
                        mongoose.disconnect();
                        process.exit(0);
                        return;
                    }
                    ttts_domain_1.Models.Reservation.find({
                        status: ttts_domain_2.ReservationUtil.STATUS_KEPT_BY_MEMBER
                    }, (err, reservations) => {
                        if (err) {
                            mongoose.disconnect();
                            process.exit(0);
                            return;
                        }
                        let promises = reservations.map((reservation, index) => {
                            return new Promise((resolve, reject) => {
                                this.logger.info('finding performance...');
                                ttts_domain_1.Models.Performance.findOne({
                                    _id: reservation.get('performance')
                                })
                                    .populate('film', 'name is_mx4d copyright')
                                    .populate('screen', 'name')
                                    .populate('theater', 'name address')
                                    .exec((err, performance) => {
                                    if (err)
                                        return reject(err);
                                    this.logger.info('updating reservation...');
                                    reservation.update({
                                        "status": ttts_domain_2.ReservationUtil.STATUS_RESERVED,
                                        "staff": staff.get('_id'),
                                        "staff_user_id": staff.get('user_id'),
                                        "staff_email": staff.get('email'),
                                        "staff_name": staff.get('name'),
                                        "staff_signature": "system",
                                        "entered": false,
                                        "updated_user": "system",
                                        "purchased_at": Date.now(),
                                        "watcher_name_updated_at": null,
                                        "watcher_name": "",
                                        "film_copyright": performance.get('film').get('copyright'),
                                        "film_is_mx4d": performance.get('film').get('is_mx4d'),
                                        "film_image": `https://${conf.get('dns_name')}/images/film/${performance.get('film').get('_id')}.jpg`,
                                        "film_name_en": performance.get('film').get('name.en'),
                                        "film_name_ja": performance.get('film').get('name.ja'),
                                        "film": performance.get('film').get('_id'),
                                        "screen_name_en": performance.get('screen').get('name.en'),
                                        "screen_name_ja": performance.get('screen').get('name.ja'),
                                        "screen": performance.get('screen').get('_id'),
                                        "theater_name_en": performance.get('theater').get('name.en'),
                                        "theater_name_ja": performance.get('theater').get('name.ja'),
                                        "theater_address_en": performance.get('theater').get('address.en'),
                                        "theater_address_ja": performance.get('theater').get('address.ja'),
                                        "theater": performance.get('theater').get('_id'),
                                        "performance_canceled": performance.get('canceled'),
                                        "performance_end_time": performance.get('end_time'),
                                        "performance_start_time": performance.get('start_time'),
                                        "performance_open_time": performance.get('open_time'),
                                        "performance_day": performance.get('day'),
                                        "purchaser_group": ttts_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF,
                                        "payment_no": paymentNo,
                                        "payment_seat_index": index,
                                        "charge": 0,
                                        "ticket_type_charge": 0,
                                        "ticket_type_name_en": "Free",
                                        "ticket_type_name_ja": "無料",
                                        "ticket_type_code": "00",
                                        "seat_grade_additional_charge": 0,
                                        "seat_grade_name_en": "Normal Seat",
                                        "seat_grade_name_ja": "ノーマルシート"
                                    }, (err, raw) => {
                                        this.logger.info('reservation updated.', err, raw);
                                        (err) ? reject(err) : resolve();
                                    });
                                });
                            });
                        });
                        Promise.all(promises).then(() => {
                            this.logger.info('promised.', err);
                            mongoose.disconnect();
                            process.exit(0);
                        }).catch((err) => {
                            this.logger.info('promised.', err);
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
    releaseGarbages() {
        mongoose.connect(MONGOLAB_URI);
        ttts_domain_1.Models.Reservation.find({
            status: ttts_domain_2.ReservationUtil.STATUS_WAITING_SETTLEMENT,
            updated_at: { $lt: moment().add(-2, 'hours').toISOString() }
        }, (err, reservations) => {
            this.logger.info('reservations found.', err, reservations);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            let paymentNos4release = [];
            let gmoUrl = (process.env.NODE_ENV === "prod") ? "https://p01.mul-pay.jp/payment/SearchTradeMulti.idPass" : "https://pt01.mul-pay.jp/payment/SearchTradeMulti.idPass";
            let promises = reservations.map((reservation) => {
                return new Promise((resolve, reject) => {
                    this.logger.info('requesting... ');
                    request.post({
                        url: gmoUrl,
                        form: {
                            ShopID: conf.get('gmo_payment_shop_id'),
                            ShopPass: conf.get('gmo_payment_shop_password'),
                            OrderID: reservation.get('payment_no'),
                            PayType: reservation.get('payment_method')
                        }
                    }, (error, response, body) => {
                        this.logger.info('request processed.', error);
                        if (error)
                            return reject(error);
                        if (response.statusCode !== 200)
                            return reject(new Error(`statusCode is ${response.statusCode}`));
                        let searchTradeResult = querystring.parse(body);
                        if (searchTradeResult['ErrCode']) {
                            if (searchTradeResult['ErrCode'] === 'M01' && searchTradeResult['ErrInfo'] === 'M01004002') {
                                paymentNos4release.push(reservation.get('payment_no'));
                            }
                            resolve();
                        }
                        else {
                            if (searchTradeResult.Status === GMOUtil_1.default.STATUS_CVS_UNPROCESSED || searchTradeResult.Status === GMOUtil_1.default.STATUS_CREDIT_UNPROCESSED) {
                                paymentNos4release.push(reservation.get('payment_no'));
                            }
                            resolve();
                        }
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                if (paymentNos4release.length === 0) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                ttts_domain_1.Models.Staff.findOne({
                    user_id: "2016sagyo2"
                }, (err, staff) => {
                    this.logger.info('staff found.', err, staff);
                    if (err) {
                        mongoose.disconnect();
                        process.exit(0);
                        return;
                    }
                    this.logger.info('updating reservations...');
                    ttts_domain_1.Models.Reservation.update({
                        payment_no: { $in: paymentNos4release }
                    }, {
                        "status": ttts_domain_2.ReservationUtil.STATUS_RESERVED,
                        "purchaser_group": ttts_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF,
                        "charge": 0,
                        "ticket_type_charge": 0,
                        "ticket_type_name_en": "Free",
                        "ticket_type_name_ja": "無料",
                        "ticket_type_code": "00",
                        "staff": staff.get('_id'),
                        "staff_user_id": staff.get('user_id'),
                        "staff_email": staff.get('email'),
                        "staff_name": staff.get('name'),
                        "staff_signature": "system",
                        "updated_user": "system",
                        "watcher_name_updated_at": null,
                        "watcher_name": ""
                    }, {
                        multi: true
                    }, (err, raw) => {
                        this.logger.info('updated.', err, raw);
                        mongoose.disconnect();
                        process.exit(0);
                    });
                });
            }).catch((err) => {
                this.logger.info('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReservationController;
