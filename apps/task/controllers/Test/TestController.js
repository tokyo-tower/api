"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const Util = require("../../../../common/Util/Util");
const BaseController_1 = require("../BaseController");
const conf = require("config");
const fs = require("fs-extra");
const moment = require("moment");
const mongodb = require("mongodb");
const mongoose = require("mongoose");
const querystring = require("querystring");
const request = require("request");
const MONGOLAB_URI = conf.get('mongolab_uri');
/**
 * テストタスクコントローラー
 *
 * @export
 * @class TestController
 * @extends {BaseController}
 */
class TestController extends BaseController_1.default {
    publishPaymentNo() {
        mongoose.connect(MONGOLAB_URI, {});
        ttts_domain_2.ReservationUtil.publishPaymentNo((err, paymentNo) => {
            this.logger.info('paymentNo is', err, paymentNo);
            mongoose.disconnect();
            process.exit(0);
        });
    }
    checkFullWidthLetter() {
        const filmName = '作家性の萌芽　1999-2003 （細田守監督短編集）『劇場版デジモンアドベンチャー』『劇場版デジモンアドベンチャー　ぼくらのウォーゲーム！』『村上隆作品　SUPERFLAT MONOGRAM』『村上隆作品　The Creatures From Planet 66 ～Roppongi Hills Story～』『おジャ魔女どれみドッカ～ン！（40話）』『明日のナージャ（OP、ED）』';
        const filmNameFullWidth = Util.toFullWidth(filmName);
        let registerDisp1 = '';
        // tslint:disable-next-line:prefer-for-of no-increment-decrement
        for (let i = 0; i < filmNameFullWidth.length; i++) {
            const letter = filmNameFullWidth[i];
            if (letter.match(/[Ａ-Ｚａ-ｚ０-９]/)
                || letter.match(/[\u3040-\u309F]/) // ひらがな
                || letter.match(/[\u30A0-\u30FF]/) // カタカナ
                || letter.match(/[一-龠]/) // 漢字
            ) {
                registerDisp1 += letter;
            }
        }
        this.logger.debug(registerDisp1);
        process.exit(0);
    }
    listIndexes() {
        mongodb.MongoClient.connect(conf.get('mongolab_uri'), (err, db) => {
            console.log(err);
            const collectionNames = [
                'authentications',
                'customer_cancel_requests',
                'films',
                'members',
                'performances',
                'pre_customers',
                'reservation_email_cues',
                'reservations',
                'screens',
                'sequences',
                'sponsors',
                'staffs',
                'tel_staffs',
                'theaters',
                'ticket_type_groups',
                'windows'
            ];
            const promises = collectionNames.map((collectionName) => {
                return new Promise((resolve, reject) => {
                    db.collection(collectionName).indexInformation((indexInfoErr, info) => {
                        if (indexInfoErr)
                            return reject();
                        console.log(collectionName, 'indexInformation is', info);
                        resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                db.close();
                process.exit(0);
            }, (paromiseErr) => {
                this.logger.error('promised.', paromiseErr);
                db.close();
                process.exit(0);
            });
        });
    }
    testCreateConnection() {
        const uri = 'mongodb://dev4gmotiffmlabmongodbuser:Yrpx-rPjr_Qjx79_R4HaknsfMEbyrQjp4NiF-XKj@ds048719.mlab.com:48719/dev4gmotiffmlabmongodb';
        mongoose.connect(MONGOLAB_URI, {});
        ttts_domain_1.Models.Reservation.count({}, (err, count) => {
            this.logger.info('count', err, count);
            const db4gmo = mongoose.createConnection(uri);
            db4gmo.collection('reservations').count({}, (err2, count2) => {
                this.logger.info('count', err2, count2);
                db4gmo.close();
                ttts_domain_1.Models.Reservation.count({}, (err3, count3) => {
                    this.logger.info('count', err3, count3);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    /**
     * メール配信された購入番号リストを取得する
     */
    // tslint:disable-next-line:prefer-function-over-method
    getPaymentNosWithEmail() {
        mongoose.connect(MONGOLAB_URI);
        ttts_domain_1.Models.GMONotification.distinct('order_id', {
            // status:{$in:["CAPTURE","PAYSUCCESS"]},
            status: { $in: ['PAYSUCCESS'] },
            processed: true
        }, (err, orderIds) => {
            console.log('orderIds length is ', err, orderIds.length);
            const file = `${__dirname}/../../../../logs/${process.env.NODE_ENV}/orderIds.txt`;
            console.log(file);
            fs.writeFileSync(file, orderIds.join('\n'), 'utf8');
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
    createEmailCues() {
        fs.readFile(`${__dirname}/../../../../logs/${process.env.NODE_ENV}/20161021_orderIds4reemail.json`, 'utf8', (err, data) => {
            const orderIds = JSON.parse(data);
            console.log('orderIds length is ', orderIds.length, err);
            const cues = orderIds.map((orderId) => {
                return {
                    payment_no: orderId,
                    is_sent: false
                };
            });
            mongoose.connect(MONGOLAB_URI);
            this.logger.info('creating ReservationEmailCues...length:', cues.length);
            ttts_domain_1.Models.ReservationEmailCue.insertMany(cues, (insertErr) => {
                this.logger.info('ReservationEmailCues created.', insertErr);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    }
    /**
     * 座席解放
     */
    // tslint:disable-next-line:prefer-function-over-method
    release() {
        mongoose.connect(MONGOLAB_URI);
        ttts_domain_1.Models.Reservation.count({
            status: ttts_domain_2.ReservationUtil.STATUS_KEPT_BY_TTTS
        }, (err, count) => {
            console.log(err, count);
            // Models.Reservation.remove({
            //     status: ReservationUtil.STATUS_KEPT_BY_TTTS
            // }, (err) => {
            //     console.log(err);
            mongoose.disconnect();
            process.exit(0);
            // });
        });
    }
    gmoNotificationProcessing2unprocess() {
        mongoose.connect(MONGOLAB_URI);
        this.logger.info('updating GMONotification...');
        ttts_domain_1.Models.GMONotification.update({
            process_status: 'PROCESSING',
            updated_at: {
                $lt: moment().add(-1, 'hour').toISOString()
            }
        }, {
            process_status: 'UNPROCESSED'
        }, {
            multi: true
        }, (err, raw) => {
            this.logger.info('GMONotification updated.', err, raw);
            mongoose.disconnect();
            process.exit(0);
        });
    }
    getBounces() {
        const query = querystring.stringify({
            api_user: conf.get('sendgrid_username'),
            api_key: conf.get('sendgrid_password'),
            date: '1'
        });
        request.get({
            url: `https://api.sendgrid.com/api/bounces.get.json?${query}`
        }, (error, response, body) => {
            this.logger.info('request processed.', error, response, body);
            process.exit(0);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TestController;
