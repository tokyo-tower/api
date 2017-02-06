import BaseController from '../BaseController';
import Util from '../../../common/Util/Util';
import {Models} from "@motionpicture/ttts-domain";
import conf = require('config');
import mongoose = require('mongoose');
import fs = require('fs-extra');
import {ReservationUtil} from "@motionpicture/ttts-domain";
import crypto = require('crypto');

let MONGOLAB_URI = conf.get<string>('mongolab_uri');

export default class StaffController extends BaseController {
    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/staffs.json`, 'utf8', (err, data) => {
            if (err) throw err;
            let staffs: Array<any> = JSON.parse(data);

            // あれば更新、なければ追加
            let promises = staffs.map((staff) => {
                // パスワードハッシュ化
                let password_salt = crypto.randomBytes(64).toString('hex');
                staff['password_salt'] = password_salt;
                staff['password_hash'] = Util.createHash(staff.password, password_salt);

                return new Promise((resolve, reject) => {
                    this.logger.debug('updating staff...');
                    Models.Staff.findOneAndUpdate(
                        {
                            user_id: staff.user_id
                        },
                        staff,
                        {
                            new: true,
                            upsert: true
                        },
                        (err) => {
                            this.logger.debug('staff updated', err);
                            (err) ? reject(err) : resolve();
                        }
                    );
                });
            });

            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            }, (err) => {
                this.logger.error('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }

    /**
     * スクリーン指定で内部関係者の先抑えを実行する
     */
    public createReservationsFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        // スクリーンごとに内部予約を追加する
        Models.Screen.distinct('_id', (err, screenIds) => {
            if (err) {
                this.logger.info('screen ids found.', err);
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            let i = 0;
            let next = () => {
                if (i < screenIds.length) {
                    this.logger.debug('createStaffReservationsByScreenId processing...', screenIds[i].toString());
                    this.createReservationsByScreenId(screenIds[i].toString(), (err) => {
                        this.logger.debug('createStaffReservationsByScreenId processed.', err);
                        i++;
                        next();
                    });
                } else {
                    this.logger.info('end.');
                    mongoose.disconnect();
                    process.exit(0);
                }
            }

            next();
        });
    }

    private createReservationsByScreenId(screenId: string, cb: (err: Error | null) => void): void {
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/staffReservations_${screenId}.json`, 'utf8', (err, data) => {
            if (err) {
                this.logger.info('no reservations.');
                return cb(null);
            };

            // 内部関係者をすべて取得
            Models.Staff.find({}, (err, staffs) => {
                if (err) throw err;

                let staffsByName: {
                    [key: string]: mongoose.Document
                } = {};
                for (let staff of staffs) {
                    staffsByName[staff.get('name')] = staff;
                }

                ReservationUtil.publishPaymentNo((err, paymentNo) => {
                        this.logger.debug('paymentNo is', paymentNo);
                        if (err) return cb(err);

                        let reservations: Array<any> = [];

                        // スクリーンのパフォーマンスをすべて取得
                        Models.Performance.find(
                            {screen: screenId}
                        )
                        .populate('film', 'name is_mx4d copyright')
                        .populate('screen', 'name')
                        .populate('theater', 'name address')
                        .exec((err, performances) => {
                            if (err) return cb(err);

                            for (let performance of performances) {
                                let reservationsByPerformance = JSON.parse(data);
                                reservationsByPerformance = reservationsByPerformance.map((reservation: any, index: number) => {
                                    let _staff = staffsByName[reservation.staff_name];

                                    return {
                                        "performance": performance.get('_id'),
                                        "seat_code": reservation.seat_code,
                                        "status": ReservationUtil.STATUS_RESERVED,
                                        "staff": _staff.get('_id'),
                                        "staff_user_id": _staff.get('user_id'),
                                        "staff_email": _staff.get('email'),
                                        "staff_name": _staff.get('name'),
                                        "staff_signature": "system",
                                        "entered": false,
                                        "updated_user": "system",
                                        "purchased_at": Date.now(),
                                        "watcher_name_updated_at": Date.now(),
                                        "watcher_name": "",
                                        "film_copyright": performance.get('film').get('copyright'),
                                        "film_is_mx4d": performance.get('film').get('is_mx4d'),
                                        "film_image": `https://${conf.get<string>('dns_name')}/images/film/${performance.get('film').get('_id')}.jpg`,
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
                                        "purchaser_group": ReservationUtil.PURCHASER_GROUP_STAFF,
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
                                    };
                                });

                                reservations = reservations.concat(reservationsByPerformance);
                            }

                            this.logger.debug('creating staff reservations...length:', reservations.length);
                            Models.Reservation.insertMany(reservations, (err) => {
                                this.logger.debug('staff reservations created.', err);
                                cb(err);
                            });
                        });
                    }
                );
            });
        });
    }

    /**
     * パフォーマンス指定で内部関係者の先抑えを行う
     * 
     * @param {string} performanceId
     */
    public createReservationsByPerformanceId(performanceId: string): void {
        mongoose.connect(MONGOLAB_URI, {});

        Models.Performance.findOne({_id: performanceId})
        .populate('film', 'name is_mx4d copyright')
        .populate('screen', 'name')
        .populate('theater', 'name address')
        .exec((err, performance) => {
            if (err) throw err;

            if (!performance) {
                this.logger.info('no performance.');
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/staffReservations_${performance.get('screen').get('_id').toString()}.json`, 'utf8', (err, data) => {
                if (err) {
                    this.logger.info('no reservations.');
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                };

                // 内部関係者をすべて取得
                Models.Staff.find({}, (err, staffs) => {
                    if (err) throw err;

                    let staffsByName: {
                        [key: string]: mongoose.Document
                    } = {};
                    for (let staff of staffs) {
                        staffsByName[staff.get('name')] = staff;
                    }

                    ReservationUtil.publishPaymentNo((err, paymentNo) => {
                        this.logger.info('paymentNo published.', err, paymentNo);
                        if (err) {
                            mongoose.disconnect();
                            process.exit(0);
                            return;
                        };

                        let reservations: Array<any> = JSON.parse(data);
                        let promises = reservations.map((reservation, index) => {
                            let _staff = staffsByName[reservation.staff_name];

                            let newReservation = {
                                "performance": performance.get('_id'),
                                "seat_code": reservation.seat_code,
                                "status": ReservationUtil.STATUS_RESERVED,
                                "staff": _staff.get('_id'),
                                "staff_user_id": _staff.get('user_id'),
                                "staff_email": _staff.get('email'),
                                "staff_name": _staff.get('name'),
                                "staff_signature": "system",
                                "entered": false,
                                "updated_user": "system",
                                "purchased_at": Date.now(),
                                "watcher_name_updated_at": Date.now(),
                                "watcher_name": "",
                                "film_copyright": performance.get('film').get('copyright'),
                                "film_is_mx4d": performance.get('film').get('is_mx4d'),
                                "film_image": `https://${conf.get<string>('dns_name')}/images/film/${performance.get('film').get('_id')}.jpg`,
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
                                "purchaser_group": ReservationUtil.PURCHASER_GROUP_STAFF,
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
                            };

                            return new Promise((resolve, reject) => {
                                this.logger.info('creating reservation...');
                                Models.Reservation.create([newReservation], (err) => {
                                    if (err) return reject(err);

                                    this.logger.info('reservation created.', err);
                                    // 途中で終了しないように。最後まで予約渡来し続ける。
                                    resolve(err);
                                })
                            });
                        });

                        Promise.all(promises).then((err) => {
                            this.logger.info('promised', err);
                            mongoose.disconnect();
                            process.exit(0);
                        });
                    });
                });
            });
        });
    }
}
