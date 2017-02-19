import {Models} from '@motionpicture/ttts-domain';
import BaseController from '../BaseController';
import * as mongoose from 'mongoose';
import * as conf from 'config';
import {ReservationUtil} from '@motionpicture/ttts-domain';
import GMOUtil from '../../../common/Util/GMO/GMOUtil';
import * as fs from 'fs-extra';
import * as request from 'request';
import * as querystring from 'querystring';
import * as moment from 'moment';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

/**
 * 分析タスクコントローラー
 *
 * @export
 * @class AnalysisController
 * @extends {BaseController}
 */
export default class AnalysisController extends BaseController {

    public checkArrayUnique(): void {
        fs.readFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/paymentNos4sagyo2.json`, 'utf8', (err, data) => {
            if (err) throw err;

            let paymentNos: string[] = JSON.parse(data);
            console.log(paymentNos.length);

            // 配列から重複削除
            paymentNos = paymentNos.filter((element, index, self) => {
                return self.indexOf(element) === index;
            });

            console.log(paymentNos.length);
            process.exit(0);
        });
    }

    /**
     * GMO分の内部アカウント作業２へRESERVED
     * GMOでCAPTURE,PAYSUCCESS,REQSUCCESS出ないかどうか確認
     * DBでWAITING_SETTLEMENTかどうか確認
     */
    public waiting2sagyo2(): void {
        mongoose.connect(MONGOLAB_URI);

        fs.readFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/paymentNos4sagyo2.json`, 'utf8', (err, data) => {
            if (err) throw err;

            const paymentNos: string[] = JSON.parse(data);
            const gmoUrl = (process.env.NODE_ENV === 'prod') ? 'https://p01.mul-pay.jp/payment/SearchTradeMulti.idPass' : 'https://pt01.mul-pay.jp/payment/SearchTradeMulti.idPass';

            const promises = paymentNos.map((paymentNo) => {
                return new Promise((resolve, reject) => {
                    // 取引状態参照
                    this.logger.info('requesting... ');
                    request.post({
                        url: gmoUrl,
                        form: {
                            ShopID: conf.get<string>('gmo_payment_shop_id'),
                            ShopPass: conf.get<string>('gmo_payment_shop_password'),
                            OrderID: paymentNo,
                            PayType: GMOUtil.PAY_TYPE_CREDIT
                        }
                    },           (error, response, body) => {
                        this.logger.info('request processed.', error);
                        if (error) return reject(error);
                        if (response.statusCode !== 200) return reject(new Error(`statusCode is ${response.statusCode}`));

                        const searchTradeResult = querystring.parse(body);

                        // クレジットカード決済情報がない場合コンビニ決済で検索
                        if (searchTradeResult['ErrCode']) {
                            request.post({
                                url: gmoUrl,
                                form: {
                                    ShopID: conf.get<string>('gmo_payment_shop_id'),
                                    ShopPass: conf.get<string>('gmo_payment_shop_password'),
                                    OrderID: paymentNo,
                                    PayType: GMOUtil.PAY_TYPE_CVS
                                }
                            },           (error, response, body) => {
                                if (error) return reject(error);
                                if (response.statusCode !== 200) return reject(new Error(`statusCode is ${response.statusCode}`));
                                const searchTradeResult = querystring.parse(body);
                                if (searchTradeResult['ErrCode']) {
                                    // 情報なければOK
                                    resolve();
                                } else {
                                    if (searchTradeResult.Status === GMOUtil.STATUS_CVS_PAYSUCCESS || searchTradeResult.Status === GMOUtil.STATUS_CVS_REQSUCCESS) {
                                        reject(new Error('searchTradeResult.Status is PAYSUCCESS or REQSUCCESS'));
                                    } else {
                                        resolve();
                                    }
                                }
                            });
                        } else {
                            if (searchTradeResult.Status === GMOUtil.STATUS_CREDIT_CAPTURE) {
                                reject(new Error('searchTradeResult.Status is CAPTURE'));
                            } else {
                                resolve();
                            }
                        }
                    });
                });
            });



            Promise.all(promises).then(() => {
                console.log(paymentNos.length);

                // DBでWAITINGでないものがあるかどうかを確認
                const promises = paymentNos.map((paymentNo) => {
                    return new Promise((resolve, reject) => {
                        this.logger.info('counting not in WAITING_SETTLEMENT, WAITING_SETTLEMENT_PAY_DESIGN');
                        Models.Reservation.count({
                            payment_no: paymentNo,
                            status: {$nin: [ReservationUtil.STATUS_WAITING_SETTLEMENT, ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN]}
                            // status: {$nin: [ReservationUtil.STATUS_WAITING_SETTLEMENT]}
                        },                       (err, count) => {
                            this.logger.info('counted.', err, count);
                            if (err) return reject(err);
                            (count > 0) ? reject(new Error('status WAITING_SETTLEMENT exists.')) : resolve();
                        });
                    });
                });

                Promise.all(promises).then(() => {
                    console.log(paymentNos.length);
                    this.logger.info('promised.');

                    // 内部関係者で確保する
                    Models.Staff.findOne({
                        user_id: '2016sagyo2'
                    },                   (err, staff) => {
                        this.logger.info('staff found.', err, staff);
                        if (err) {
                            mongoose.disconnect();
                            process.exit(0);
                            return;
                        }


                        this.logger.info('updating reservations...');
                        Models.Reservation.update({
                            payment_no: {$in: paymentNos}
                        },                        {
                            status: ReservationUtil.STATUS_RESERVED,
                            purchaser_group: ReservationUtil.PURCHASER_GROUP_STAFF,

                            charge: 0,
                            ticket_type_charge: 0,
                            ticket_type_name_en: 'Free',
                            ticket_type_name_ja: '無料',
                            ticket_type_code: '00',

                            staff: staff.get('_id'),
                            staff_user_id: staff.get('user_id'),
                            staff_email: staff.get('email'),
                            staff_name: staff.get('name'),
                            staff_signature: 'system20161024', // 署名どうする？
                            updated_user: 'system',
                            // "purchased_at": Date.now(), // 購入日更新する？
                            watcher_name_updated_at: null,
                            watcher_name: ''
                        },                        {
                            multi: true
                        },                        (err, raw) => {
                            this.logger.info('updated.', err, raw);
                            console.log(paymentNos.length);
                            mongoose.disconnect();
                            process.exit(0);
                        });
                    });

                }).catch((err) => {
                    this.logger.error('promised.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            }).catch((err) => {
                this.logger.error('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }

    /**
     * コンビニ決済でwaitingのものを確定にする
     * GMOでPAYSUCCESSを確認
     * DBでWAITING_SETTLEMENTかどうか確認
     */
    public cvsWaiting2reserved(): void {
        mongoose.connect(MONGOLAB_URI);

        fs.readFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/paymentNos4cvsWaiting2reserved.json`, 'utf8', (err, data) => {
            this.logger.info('file read.', err);
            const paymentNos: string[] = JSON.parse(data);
            const gmoUrl = (process.env.NODE_ENV === 'prod') ? 'https://p01.mul-pay.jp/payment/SearchTradeMulti.idPass' : 'https://pt01.mul-pay.jp/payment/SearchTradeMulti.idPass';

            const promises = paymentNos.map((paymentNo) => {
                return new Promise((resolve, reject) => {
                    // 取引状態参照
                    this.logger.info('requesting... ');
                    request.post({
                        url: gmoUrl,
                        form: {
                            ShopID: conf.get<string>('gmo_payment_shop_id'),
                            ShopPass: conf.get<string>('gmo_payment_shop_password'),
                            OrderID: paymentNo,
                            PayType: GMOUtil.PAY_TYPE_CVS
                        }
                    },           (error, response, body) => {
                        this.logger.info('request processed.', error);
                        if (error) return reject(error);
                        if (response.statusCode !== 200) return reject(new Error(`statusCode is ${response.statusCode} ${paymentNo}`));

                        const searchTradeResult = querystring.parse(body);

                        if (searchTradeResult['ErrCode']) {
                            reject(new Error(`ErrCode is ${searchTradeResult['ErrCode']} ${paymentNo}`));
                        } else {
                            if (searchTradeResult.Status === GMOUtil.STATUS_CVS_PAYSUCCESS) {
                                resolve();
                            } else {
                                reject(new Error('searchTradeResult.Status is not PAYSUCCESS'));
                            }
                        }
                    });
                });
            });



            Promise.all(promises).then(() => {
                console.log(paymentNos.length);

                this.logger.info('counting not in WAITING_SETTLEMENT');
                Models.Reservation.count({
                    payment_no: {$in: paymentNos},
                    $or: [
                        {
                            status: {$nin: [ReservationUtil.STATUS_WAITING_SETTLEMENT]}
                        },
                        {
                            payment_method: {$nin: [GMOUtil.PAY_TYPE_CVS]}
                        }
                    ]
                },                       (err, count) => {
                    this.logger.info('counted.', err, count);

                    if (err) {
                        mongoose.disconnect();
                        process.exit(0);
                        return;
                    }

                    if (count > 0) {
                        mongoose.disconnect();
                        process.exit(0);
                        return;
                    }

                    Models.Reservation.update({
                        payment_no: {$in: paymentNos}
                    },                        {
                        status: ReservationUtil.STATUS_RESERVED
                    },                        {
                        multi: true
                    },                        (err, raw) => {
                        this.logger.info('updated.', err, raw);
                        console.log(paymentNos.length);
                        mongoose.disconnect();
                        process.exit(0);
                    });
                });
            }).catch((err) => {
                this.logger.error('promised.', err);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }

    /**
     * ペイデザイン決済でwaitingのものを確定にする
     * DBでWAITING_SETTLEMENT_PAY_DESIGNかどうか確認
     */
    public payDesignWaiting2reserved(): void {
        mongoose.connect(MONGOLAB_URI);

        fs.readFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/paymentNos4payDesignWaiting2reserved.json`, 'utf8', (err, data) => {
            this.logger.info('file read.', err);
            const paymentNos: string[] = JSON.parse(data);


            this.logger.info('counting not in WAITING_SETTLEMENT_PAY_DESIGN');
            Models.Reservation.count({
                payment_no: {$in: paymentNos},
                $or: [
                    {
                        status: {$nin: [ReservationUtil.STATUS_WAITING_SETTLEMENT_PAY_DESIGN]}
                    },
                    {
                        payment_method: {$nin: [GMOUtil.PAY_TYPE_CVS]}
                    }
                ]
            },                       (err, count) => {
                this.logger.info('counted.', err, count);

                if (err) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }

                if (count > 0) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }

                Models.Reservation.update({
                    payment_no: {$in: paymentNos}
                },                        {
                    status: ReservationUtil.STATUS_RESERVED
                },                        {
                    multi: true
                },                        (err, raw) => {
                    this.logger.info('updated.', err, raw);
                    console.log(paymentNos.length);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }

    /**
     * GMOコンビニ決済キャンセルリストを内部作業用２確保に変更する
     */
    public cvsCanceled2sagyo2(): void {
        mongoose.connect(MONGOLAB_URI);

        fs.readFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/paymentNos4cvsCanceled2sagyo2.json`, 'utf8', (err, data) => {
            this.logger.info('file read.', err);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            const paymentNos: string[] = JSON.parse(data);
            if (paymentNos.length === 0) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }

            // 内部関係者で確保する
            Models.Staff.findOne({
                user_id: '2016sagyo2'
            },                   (err, staff) => {
                this.logger.info('staff found.', err, staff);
                if (err) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }


                this.logger.info('updating reservations...');
                Models.Reservation.update({
                    payment_no: {$in: paymentNos}
                },                        {
                    status: ReservationUtil.STATUS_RESERVED,
                    purchaser_group: ReservationUtil.PURCHASER_GROUP_STAFF,

                    charge: 0,
                    ticket_type_charge: 0,
                    ticket_type_name_en: 'Free',
                    ticket_type_name_ja: '無料',
                    ticket_type_code: '00',

                    staff: staff.get('_id'),
                    staff_user_id: staff.get('user_id'),
                    staff_email: staff.get('email'),
                    staff_name: staff.get('name'),
                    staff_signature: 'system', // 署名どうする？
                    updated_user: 'system',
                    // "purchased_at": Date.now(), // 購入日更新する？
                    watcher_name_updated_at: null,
                    watcher_name: ''
                },                        {
                    multi: true
                },                        (err, raw) => {
                    this.logger.info('updated.', err, raw);
                    console.log(paymentNos.length);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }

    public createReservationsFromLogs(): void {
        fs.readFile(`${process.cwd()}/logs/gmoOrderIdsCVS.json`, 'utf8', (err, data) => {
            if (err) throw err;

            const paymentNos: string[] = JSON.parse(data);
            console.log(paymentNos.length);


            const promises = paymentNos.map((paymentNo) => {
                return new Promise((resolve, reject) => {
                    fs.readFile(`${process.cwd()}/logs/reservationsGmoError/${paymentNo[paymentNo.length - 1]}/${paymentNo}.log`, 'utf8', (err, data) => {
                        this.logger.info('log found', err);
                        if (err) return resolve();

                        // let pattern = /\[(.+)] \[INFO] reservation - updating reservation all infos...update: { _id: '(.+)',\n  status: '(.+)',\n  seat_code: '(.+)',\n  seat_grade_name_ja: '(.+)',\n  seat_grade_name_en: '(.+)',\n  seat_grade_additional_charge: (.+),\n  ticket_type_code: '(.+)',\n  ticket_type_name_ja: '(.+)',\n  ticket_type_name_en: '(.+)',\n  ticket_type_charge: (.+),\n  charge: (.+),\n  payment_no: '(.+)',\n  purchaser_group: '(.+)',\n  performance: '(.+)',\n/;
                        const pattern = /reservation - updating reservation all infos...update: {[^}]+}/g;
                        const matches = data.match(pattern);
                        let json = '[\n';

                        if (matches) {
                            matches.forEach((match, index) => {
                                json += (index > 0) ? ',\n' : '';
                                const reservation = match.replace('reservation - updating reservation all infos...update: ', '')
                                    .replace(/"/g, '\\"')
                                    .replace(/ _id:/g, '"_id":')
                                    .replace(/  ([a-z_]+[a-z0-9_]+):/g, '"$1":')
                                    .replace(/: '/g, ': "')
                                    .replace(/',/g, '",')
                                    .replace(/\\'/g, '\'');
                                json += reservation;
                            });
                        }

                        json += '\n]';

                        this.logger.info('writing json...');
                        // fs.writeFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCredit/${paymentNo}.json`, json, 'utf8', (err) => {
                        fs.writeFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/jsonsFromGmoOrderIdsCVS/${paymentNo}.json`, json, 'utf8', (err) => {
                            this.logger.info('json written', err);
                            (err) ? reject(err) : resolve();
                        });
                    });
                });
            });

            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                process.exit(0);
            }).catch((err) => {
                this.logger.error('promised.', err);
                process.exit(0);
            });
        });

    }

    /**
     * オーダーIDからGMO取消を行う
     */
    public cancelGMO(): void {
        let options: any;
        const paymentNo = '50000001412';

        // 取引状態参照
        options = {
            // url: 'https://pt01.mul-pay.jp/payment/SearchTrade.idPass',
            form: {
                ShopID: conf.get<string>('gmo_payment_shop_id'),
                ShopPass: conf.get<string>('gmo_payment_shop_password'),
                OrderID: paymentNo
            }
        };
        this.logger.info('requesting... options:', options);
        request.post('https://pt01.mul-pay.jp/payment/SearchTrade.idPass', options, (error, response, body) => {
            this.logger.info('request processed.', error, body);
            if (error) return process.exit(0);
            if (response.statusCode !== 200) return process.exit(0);
            const searchTradeResult = querystring.parse(body);
            if (searchTradeResult['ErrCode']) return process.exit(0);
            if (searchTradeResult.Status !== GMOUtil.STATUS_CREDIT_CAPTURE) return process.exit(0); // 即時売上状態のみ先へ進める

            this.logger.info('searchTradeResult is ', searchTradeResult);

            // 決済変更
            options = {
                // url: 'https://pt01.mul-pay.jp/payment/AlterTran.idPass',
                form: {
                    ShopID: conf.get<string>('gmo_payment_shop_id'),
                    ShopPass: conf.get<string>('gmo_payment_shop_password'),
                    AccessID: searchTradeResult.AccessID,
                    AccessPass: searchTradeResult.AccessPass,
                    JobCd: GMOUtil.STATUS_CREDIT_VOID
                }
            };
            this.logger.info('requesting... options:', options);
            request.post('https://pt01.mul-pay.jp/payment/AlterTran.idPass', options, (error, response, body) => {
                this.logger.info('request processed.', error, body);
                if (error) return process.exit(0);
                if (response.statusCode !== 200) return process.exit(0);
                const alterTranResult = querystring.parse(body);
                if (alterTranResult['ErrCode']) return process.exit(0);

                this.logger.info('alterTranResult is ', alterTranResult);

                process.exit(0);
            });
        });
    }

    public countReservations(): void {
        mongoose.connect(MONGOLAB_URI, {});
        Models.Reservation.find({
            purchaser_group: {$in: [ReservationUtil.PURCHASER_GROUP_CUSTOMER, ReservationUtil.PURCHASER_GROUP_MEMBER]},
            // payment_no: "77000110810"
            status: ReservationUtil.STATUS_RESERVED,
            // status: ReservationUtil.STATUS_WAITING_SETTLEMENT,
            purchased_at: {$gt: moment('2016-10-20T12:00:00+9:00')}
        },                      'payment_no', (err, reservations) => {
            if (err) throw err;

            this.logger.info('reservations length is', reservations.length);
            const paymentNos: string[] = [];
            reservations.forEach((reservation) => {
                if (paymentNos.indexOf(reservation.get('payment_no')) < 0) {
                    paymentNos.push(reservation.get('payment_no'));
                }
            });
            this.logger.info('paymentNos.length is', paymentNos.length);
            mongoose.disconnect();
            process.exit(0);
        });
    }

    public countReservationCues(): void {
        mongoose.connect(MONGOLAB_URI, {});
        Models.ReservationEmailCue.count({
            is_sent: false
        },                               (err, count) => {
            if (err) throw err;

            this.logger.info('count is', count);
            mongoose.disconnect();
            process.exit(0);
        });
    }

    /**
     * メール配信された購入番号リストを取得する
     */
    public getPaymentNosWithEmail(): void {
        mongoose.connect(MONGOLAB_URI);
        Models.GMONotification.distinct('order_id', {
            // status:{$in:["CAPTURE","PAYSUCCESS"]},
            status: {$in: ['PAYSUCCESS']},
            processed: true
        },                              (err, orderIds) => {
            if (err) throw err;

            console.log('orderIds length is ', orderIds.length);
            const file = `${__dirname}/../../../../logs/${process.env.NODE_ENV}/orderIds.txt`;
            console.log(file);
            fs.writeFileSync(file, orderIds.join("\n"), 'utf8');

            mongoose.disconnect();
            process.exit(0);
        });


        // fs.readFile(`${process.cwd()}/logs/${process.env.NODE_ENV}/orderIds.json`, 'utf8', (err, data) => {
        //     console.log(err);
        //     let orderIds: Array<string> = JSON.parse(data);
        //     console.log('orderIds length is ', orderIds.length);

        //     mongoose.connect(MONGOLAB_URI);
        //     this.logger.info('finding...');
        //     Models.ReservationEmailCue.distinct('payment_no', {
        //         is_sent: true,
        //         payment_no: {$in: orderIds}
        //     }, (err, paymentNos) => {
        //         console.log('paymentNos length is ', paymentNos.length);
        //         let file = `${__dirname}/../../../../logs/${process.env.NODE_ENV}/paymentNos.txt`;
        //         console.log(file);
        //         fs.writeFileSync(file, paymentNos.join("\n"), 'utf8');

        //         mongoose.disconnect();
        //         process.exit(0);
        //     });

        // });
    }

    public createEmailCues(): void {
        fs.readFile(`${__dirname}/../../../../logs/${process.env.NODE_ENV}/20161021_orderIds4reemail.json`, 'utf8', (err, data) => {
            if (err) throw err;

            const orderIds: string[] = JSON.parse(data);
            console.log('orderIds length is ', orderIds.length);

            const cues = orderIds.map((orderId) => {
                return {
                    payment_no: orderId,
                    is_sent: false
                };
            });

            mongoose.connect(MONGOLAB_URI);
            this.logger.info('creating ReservationEmailCues...length:', cues.length);
            Models.ReservationEmailCue.insertMany(cues, (err) => {
                this.logger.info('ReservationEmailCues created.', err);

                mongoose.disconnect();
                process.exit(0);
            });
        });
    }


    /**
     * GMO取引状態を参照する
     */
    public searchTrade(): void {
        const paymentNo = '92122101008';

        // 取引状態参照
        // this.logger.info('requesting...');
        request.post({
            url: 'https://pt01.mul-pay.jp/payment/SearchTrade.idPass',
            form: {
                ShopID: conf.get<string>('gmo_payment_shop_id'),
                ShopPass: conf.get<string>('gmo_payment_shop_password'),
                OrderID: paymentNo,
                PayType: GMOUtil.PAY_TYPE_CREDIT
            }
        },           (error, response, body) => {
            // this.logger.info('request processed.', error, body);
            if (error) return process.exit(0);
            if (response.statusCode !== 200) return process.exit(0);

            const searchTradeResult = querystring.parse(body);
            // this.logger.info('searchTradeResult is ', searchTradeResult);

            if (searchTradeResult['ErrCode']) return process.exit(0);

            let statusStr = '';
            switch (searchTradeResult.Status) {
                case GMOUtil.STATUS_CVS_UNPROCESSED:
                    statusStr = '未決済';
                    break;

                case GMOUtil.STATUS_CVS_REQSUCCESS:
                    statusStr = '要求成功';
                    break;

                case GMOUtil.STATUS_CVS_PAYSUCCESS:
                    statusStr = '決済完了';
                    break;

                case GMOUtil.STATUS_CVS_PAYFAIL:
                    statusStr = '決済失敗';
                    break;

                case GMOUtil.STATUS_CVS_EXPIRED:
                    statusStr = '期限切れ';
                    break;

                case GMOUtil.STATUS_CVS_CANCEL:
                    statusStr = '支払い停止';
                    break;

                case GMOUtil.STATUS_CREDIT_CAPTURE:
                    statusStr = '即時売上';
                    break;

                case GMOUtil.STATUS_CREDIT_VOID:
                    statusStr = '取消';
                    break;

                default:
                    break;

            }

            console.log(`${statusStr} \\${searchTradeResult.Amount}`);
            process.exit(0);
        });
    }
}
