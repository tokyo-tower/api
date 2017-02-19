import { Models } from '@motionpicture/ttts-domain';
import BaseController from '../BaseController';
import * as mongodb from 'mongodb';
import * as mongoose from 'mongoose';
import * as conf from 'config';
import { ReservationUtil } from '@motionpicture/ttts-domain';
import Util from '../../../common/Util/Util';
import * as fs from 'fs-extra';
import * as request from 'request';
import * as querystring from 'querystring';
import * as moment from 'moment';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

/**
 * テストタスクコントローラー
 *
 * @export
 * @class TestController
 * @extends {BaseController}
 */
export default class TestController extends BaseController {
    public publishPaymentNo(): void {
        mongoose.connect(MONGOLAB_URI, {});
        ReservationUtil.publishPaymentNo((err, paymentNo) => {
            this.logger.info('paymentNo is', err, paymentNo);
            mongoose.disconnect();
            process.exit(0);
        });
    }

    public checkFullWidthLetter() {
        const filmName = '作家性の萌芽　1999-2003 （細田守監督短編集）『劇場版デジモンアドベンチャー』『劇場版デジモンアドベンチャー　ぼくらのウォーゲーム！』『村上隆作品　SUPERFLAT MONOGRAM』『村上隆作品　The Creatures From Planet 66 ～Roppongi Hills Story～』『おジャ魔女どれみドッカ～ン！（40話）』『明日のナージャ（OP、ED）』';
        const filmNameFullWidth = Util.toFullWidth(filmName);
        let registerDisp1 = '';
        for (let i = 0; i < filmNameFullWidth.length; i++) {
            const letter = filmNameFullWidth[i];
            if (
                letter.match(/[Ａ-Ｚａ-ｚ０-９]/)
                || letter.match(/[\u3040-\u309F]/) // ひらがな
                || letter.match(/[\u30A0-\u30FF]/) // カタカナ
                || letter.match(/[一-龠]/) // 漢字
            ) {
                registerDisp1 += letter;
            }
        }
        console.log(registerDisp1);

        process.exit(0);
    }

    public listIndexes(): void {
        mongodb.MongoClient.connect(conf.get<string>('mongolab_uri'), (err, db) => {
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
                    db.collection(collectionName).indexInformation((err, info) => {
                        if (err) return reject();

                        console.log(collectionName, 'indexInformation is', info);
                        resolve();
                    });
                });
            });

            Promise.all(promises).then(() => {
                this.logger.info('promised.');
                db.close();
                process.exit(0);
            }, (err) => {
                this.logger.error('promised.', err);
                db.close();
                process.exit(0);
            });
        });
    }

    public testCreateConnection(): void {
        const uri = 'mongodb://dev4gmotiffmlabmongodbuser:Yrpx-rPjr_Qjx79_R4HaknsfMEbyrQjp4NiF-XKj@ds048719.mlab.com:48719/dev4gmotiffmlabmongodb';
        mongoose.connect(MONGOLAB_URI, {});
        Models.Reservation.count({
        }, (err, count) => {
            this.logger.info('count', err, count);

            const db4gmo = mongoose.createConnection(uri);
            db4gmo.collection('reservations').count({
            }, (err, count) => {
                this.logger.info('count', err, count);
                db4gmo.close();

                Models.Reservation.count({
                }, (err, count) => {
                    this.logger.info('count', err, count);

                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }

    /**
     * メール配信された購入番号リストを取得する
     */
    public getPaymentNosWithEmail(): void {
        mongoose.connect(MONGOLAB_URI);
        Models.GMONotification.distinct('order_id', {
            // status:{$in:["CAPTURE","PAYSUCCESS"]},
            status: { $in: ['PAYSUCCESS'] },
            processed: true
        }, (err, orderIds) => {
            console.log('orderIds length is ', err, orderIds.length);
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
            const orderIds: string[] = JSON.parse(data);
            console.log('orderIds length is ', orderIds.length, err);

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
     * 座席解放
     */
    public release(): void {
        mongoose.connect(MONGOLAB_URI);
        Models.Reservation.count({
            status: ReservationUtil.STATUS_KEPT_BY_TTTS
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

    public gmoNotificationProcessing2unprocess(): void {
        mongoose.connect(MONGOLAB_URI);

        this.logger.info('updating GMONotification...');
        Models.GMONotification.update({
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

    public getBounces(): void {
        const query = querystring.stringify({
            api_user: conf.get<string>('sendgrid_username'),
            api_key: conf.get<string>('sendgrid_password'),
            date: '1'
            // start_date: "2016-10-18",
            // end_date: "2016-10-19"
        });
        request.get({
            url: `https://api.sendgrid.com/api/bounces.get.json?${query}`
            // url: `https://api.sendgrid.com/api/blocks.get.json?${query}`
            // url: `https://api.sendgrid.com/api/invalidemails.get.json?${query}`
            // url: `https://api.sendgrid.com/api/spamreports.get.json?${query}`
        }, (error, response, body) => {
            this.logger.info('request processed.', error, response, body);
            process.exit(0);
        });
    }
}
