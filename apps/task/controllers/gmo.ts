/**
 * GMOタスクコントローラー
 *
 * @namespace task/GMOController
 */

import { Models } from '@motionpicture/ttts-domain';
import { ReservationUtil } from '@motionpicture/ttts-domain';
import { ReservationEmailCueUtil } from '@motionpicture/ttts-domain';
import { GMONotificationUtil } from '@motionpicture/ttts-domain';
import * as GMOUtil from '../../../common/Util/GMO/GMOUtil';

import * as conf from 'config';
import * as log4js from 'log4js';
import * as moment from 'moment';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');
const MONGOLAB_URI_FOR_GMO = conf.get<string>('mongolab_uri_for_gmo');

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
 * 通知を監視させる
 *
 * @memberOf task/GMOController
 */
export function watch(): void {
    mongoose.connect(MONGOLAB_URI);
    let count = 0;

    const INTERVAL_MILLISECONDS = 500;
    const MAX_NUMBER_OF_PARALLEL_TASK = 10;
    setInterval(
        () => {
            if (count > MAX_NUMBER_OF_PARALLEL_TASK) return;

            count += 1;
            processOne(() => {
                count -= 1;
            });
        },
        INTERVAL_MILLISECONDS
    );
}

/**
 * GMO結果通知を処理する
 *
 * @memberOf task/GMOController
 */
export function processOne(cb: () => void): void {
    logger.info('finding notification...');
    const db4gmo = mongoose.createConnection(MONGOLAB_URI_FOR_GMO);
    db4gmo.collection('gmo_notifications').findOneAndUpdate(
        {
            process_status: GMONotificationUtil.PROCESS_STATUS_UNPROCESSED
        },
        {
            $set: {
                process_status: GMONotificationUtil.PROCESS_STATUS_PROCESSING
            }
        },
        ((err, result) => {
            db4gmo.close();
            logger.info('notification found.', err, result);

            const notification = result.value;
            if (err) return next(err, null, cb);
            if (!notification) return next(null, notification, cb);

            // 内容の整合性チェック
            logger.info('finding reservations...payment_no:', notification.order_id);
            Models.Reservation.find(
                {
                    payment_no: notification.order_id
                    // tslint:disable-next-line:max-func-body-length
                },
                // tslint:disable-next-line:max-func-body-length
                (findReservationErr, reservations) => {
                    logger.info('reservations found.', findReservationErr, reservations.length);
                    if (findReservationErr) return next(findReservationErr, notification, cb);
                    if (reservations.length === 0) return next(null, notification, cb);

                    // チェック文字列
                    const shopPassString = GMOUtil.createShopPassString(
                        notification.shop_id,
                        notification.order_id,
                        notification.amount,
                        conf.get<string>('gmo_payment_shop_password'),
                        moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss')
                    );
                    logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
                    if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                        // 不正な結果通知なので、処理済みにする
                        return next(null, notification, cb);
                    }

                    // クレジットカード決済の場合
                    if (notification.pay_type === GMOUtil.PAY_TYPE_CREDIT) {
                        switch (notification.status) {
                            case GMOUtil.STATUS_CREDIT_CAPTURE:
                                // 予約完了ステータスへ変更
                                logger.info('updating reservations by paymentNo...', notification.order_id);
                                Models.Reservation.update(
                                    { payment_no: notification.order_id },
                                    {
                                        gmo_shop_id: notification.shop_id,
                                        gmo_amount: notification.amount,
                                        gmo_tax: notification.tax,
                                        gmo_access_id: notification.access_id,
                                        gmo_forward: notification.forward,
                                        gmo_method: notification.method,
                                        gmo_approve: notification.approve,
                                        gmo_tran_id: notification.tran_id,
                                        gmo_tran_date: notification.tran_date,
                                        gmo_pay_type: notification.pay_type,
                                        gmo_status: notification.status,
                                        status: ReservationUtil.STATUS_RESERVED,
                                        updated_user: 'system'
                                    },
                                    { multi: true },
                                    (updateErr, raw) => {
                                        logger.info('reservations updated.', updateErr, raw);
                                        if (updateErr) return next(updateErr, notification, cb);

                                        // 完了メールキュー追加(あれば更新日時を更新するだけ)
                                        logger.info('creating reservationEmailCue...');
                                        Models.ReservationEmailCue.findOneAndUpdate(
                                            {
                                                payment_no: notification.order_id,
                                                template: ReservationEmailCueUtil.TEMPLATE_COMPLETE
                                            },
                                            {
                                                $set: { updated_at: Date.now() },
                                                $setOnInsert: { status: ReservationEmailCueUtil.STATUS_UNSENT }
                                            },
                                            {
                                                upsert: true,
                                                new: true
                                            },
                                            (updateEmailCueErr, cue) => {
                                                logger.info('reservationEmailCue created.', updateEmailCueErr, cue);
                                                if (updateEmailCueErr) return next(updateEmailCueErr, notification, cb);

                                                // あったにせよなかったにせよ処理済に
                                                next(null, notification, cb);
                                            }
                                        );
                                    }
                                );

                                break;

                            case GMOUtil.STATUS_CREDIT_UNPROCESSED:
                                // 未決済の場合、放置
                                // ユーザーが「戻る」フローでキャンセルされる、あるいは、時間経過で空席になる
                                next(null, notification, cb);
                                break;

                            case GMOUtil.STATUS_CREDIT_AUTHENTICATED:
                            case GMOUtil.STATUS_CREDIT_CHECK:
                                next(null, notification, cb);
                                break;

                            case GMOUtil.STATUS_CREDIT_AUTH:
                                next(null, notification, cb);
                                break;

                            case GMOUtil.STATUS_CREDIT_SALES:
                                next(null, notification, cb);
                                break;

                            case GMOUtil.STATUS_CREDIT_VOID: // 取消し
                                // 空席に戻さない(つくったけれども、連動しない方向で仕様決定)
                                next(null, notification, cb);
                                break;

                            case GMOUtil.STATUS_CREDIT_RETURN:
                                next(null, notification, cb);
                                break;

                            case GMOUtil.STATUS_CREDIT_RETURNX:
                                next(null, notification, cb);
                                break;

                            case GMOUtil.STATUS_CREDIT_SAUTH:
                                next(null, notification, cb);
                                break;

                            default:
                                next(null, notification, cb);
                                break;
                        }
                    } else if (notification.pay_type === GMOUtil.PAY_TYPE_CVS) {
                        switch (notification.status) {
                            case GMOUtil.STATUS_CVS_PAYSUCCESS:
                                // 予約完了ステータスへ変更
                                logger.info('updating reservations by paymentNo...', notification.order_id);
                                Models.Reservation.update(
                                    { payment_no: notification.order_id },
                                    {
                                        status: ReservationUtil.STATUS_RESERVED,
                                        updated_user: 'system'
                                    },
                                    { multi: true },
                                    (updateErr, raw) => {
                                        logger.info('reservations updated.', updateErr, raw);
                                        if (updateErr) return next(updateErr, notification, cb);

                                        // 完了メールキュー追加(あれば更新日時を更新するだけ)
                                        logger.info('creating reservationEmailCue...');
                                        Models.ReservationEmailCue.findOneAndUpdate(
                                            {
                                                payment_no: notification.order_id,
                                                template: ReservationEmailCueUtil.TEMPLATE_COMPLETE
                                            },
                                            {
                                                $set: { updated_at: Date.now() },
                                                $setOnInsert: { status: ReservationEmailCueUtil.STATUS_UNSENT }
                                            },
                                            {
                                                upsert: true,
                                                new: true
                                            },
                                            (updateEmailCueErr, cue) => {
                                                logger.info('reservationEmailCue created.', updateEmailCueErr, cue);
                                                if (updateEmailCueErr) return next(updateEmailCueErr, notification, cb);

                                                // あったにせよなかったにせよ処理済に
                                                next(null, notification, cb);
                                            }
                                        );
                                    }
                                );

                                break;

                            case GMOUtil.STATUS_CVS_REQSUCCESS:
                                // GMOパラメータを予約に追加
                                logger.info('updating reservations by paymentNo...', notification.order_id);
                                Models.Reservation.update(
                                    { payment_no: notification.order_id },
                                    {
                                        gmo_shop_id: notification.shop_id,
                                        gmo_amount: notification.amount,
                                        gmo_tax: notification.tax,
                                        gmo_cvs_code: notification.cvs_code,
                                        gmo_cvs_conf_no: notification.cvs_conf_no,
                                        gmo_cvs_receipt_no: notification.cvs_receipt_no,
                                        gmo_payment_term: notification.payment_term,
                                        updated_user: 'system'
                                    },
                                    { multi: true },
                                    (updateErr, raw) => {
                                        logger.info('reservations updated.', updateErr, raw);
                                        if (updateErr) return next(updateErr, notification, cb);

                                        // 仮予約完了メールキュー追加(あれば更新日時を更新するだけ)
                                        logger.info('creating reservationEmailCue...');
                                        Models.ReservationEmailCue.findOneAndUpdate(
                                            {
                                                payment_no: notification.order_id,
                                                template: ReservationEmailCueUtil.TEMPLATE_TEMPORARY
                                            },
                                            {
                                                $set: { updated_at: Date.now() },
                                                $setOnInsert: { status: ReservationEmailCueUtil.STATUS_UNSENT }
                                            },
                                            {
                                                upsert: true,
                                                new: true
                                            },
                                            (updateEmailCueErr, cue) => {
                                                logger.info('reservationEmailCue created.', updateEmailCueErr, cue);
                                                if (updateEmailCueErr) return next(updateEmailCueErr, notification, cb);

                                                // あったにせよなかったにせよ処理済に
                                                next(null, notification, cb);
                                            }
                                        );
                                    }
                                );

                                break;

                            case GMOUtil.STATUS_CVS_UNPROCESSED:
                                next(null, notification, cb);
                                break;

                            case GMOUtil.STATUS_CVS_PAYFAIL: // 決済失敗
                            case GMOUtil.STATUS_CVS_CANCEL: // 支払い停止
                                // 空席に戻す
                                logger.info('removing reservations...payment_no:', notification.order_id);
                                const promises = reservations.map((reservation) => {
                                    return new Promise((resolve, reject) => {
                                        logger.info('removing reservation...', reservation.get('_id'));
                                        reservation.remove((removeErr) => {
                                            logger.info('reservation removed.', reservation.get('_id'), removeErr);
                                            (removeErr) ? reject(removeErr) : resolve();
                                        });
                                    });
                                });
                                Promise.all(promises).then(
                                    () => {
                                        // processedフラグをたてる
                                        next(null, notification, cb);
                                    },
                                    (promiseErr) => {
                                        next(promiseErr, notification, cb);
                                    }
                                );

                                break;

                            case GMOUtil.STATUS_CVS_EXPIRED: // 期限切れ
                                // 内部で確保する仕様の場合
                                Models.Staff.findOne(
                                    {
                                        user_id: '2016sagyo2'
                                    },
                                    (findStaffErr, staff) => {
                                        logger.info('staff found.', findStaffErr, staff);
                                        if (findStaffErr) return next(findStaffErr, notification, cb);

                                        logger.info('updating reservations...');
                                        Models.Reservation.update(
                                            {
                                                payment_no: notification.order_id
                                            },
                                            {
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
                                                staff_signature: 'system',
                                                updated_user: 'system',
                                                // "purchased_at": Date.now(), // 購入日更新しない
                                                watcher_name_updated_at: null,
                                                watcher_name: ''
                                            },
                                            {
                                                multi: true
                                            },
                                            (updateErr, raw) => {
                                                logger.info('updated.', updateErr, raw);
                                                next(updateErr, notification, cb);
                                            }
                                        );
                                    }
                                );

                                // 何もしない仕様の場合
                                // next(null, notification, cb);

                                break;

                            default:
                                next(null, notification, cb);
                                break;
                        }

                    } else {
                        // 他の決済は本案件では非対応
                        return next(null, notification, cb);
                    }
                }
            );
        }
        ));
}

/**
 * プロセスを終了する
 *
 * @param {Object} notification
 *
 * @ignore
 */
function next(err: Error | null, notification: any, cb: () => void): void {
    if (!notification) return cb();

    const status = (err) ? GMONotificationUtil.PROCESS_STATUS_UNPROCESSED : GMONotificationUtil.PROCESS_STATUS_PROCESSED;

    // processedフラグをたてる
    logger.info('setting process_status...', status);
    const db4gmo = mongoose.createConnection(MONGOLAB_URI_FOR_GMO);
    notification.process_status = status;
    db4gmo.collection('gmo_notifications').findOneAndUpdate(
        {
            _id: notification._id
        },
        {
            $set: {
                process_status: status
            }
        },
        (updateGmoNotificationErr, result) => {
            logger.info('notification saved.', updateGmoNotificationErr, result);
            db4gmo.close();
            cb();
        }
    );
}
