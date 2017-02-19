"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const ttts_domain_2 = require("@motionpicture/ttts-domain");
const ttts_domain_3 = require("@motionpicture/ttts-domain");
const ttts_domain_4 = require("@motionpicture/ttts-domain");
const GMOUtil_1 = require("../../../common/Util/GMO/GMOUtil");
const BaseController_1 = require("../BaseController");
const mongoose = require("mongoose");
const conf = require("config");
const moment = require("moment");
const MONGOLAB_URI = conf.get('mongolab_uri');
const MONGOLAB_URI_FOR_GMO = conf.get('mongolab_uri_for_gmo');
/**
 * GMOタスクコントローラー
 *
 * @export
 * @class GMOController
 * @extends {BaseController}
 */
class GMOController extends BaseController_1.default {
    /**
     * 通知を監視させる
     */
    watch() {
        mongoose.connect(MONGOLAB_URI);
        let count = 0;
        setInterval(() => {
            if (count > 10)
                return;
            count++;
            this.processOne(() => {
                count--;
            });
        }, 500);
    }
    /**
     * GMO結果通知を処理する
     */
    processOne(cb) {
        this.logger.info('finding notification...');
        const db4gmo = mongoose.createConnection(MONGOLAB_URI_FOR_GMO);
        db4gmo.collection('gmo_notifications').findOneAndUpdate({
            process_status: ttts_domain_4.GMONotificationUtil.PROCESS_STATUS_UNPROCESSED
        }, {
            $set: {
                process_status: ttts_domain_4.GMONotificationUtil.PROCESS_STATUS_PROCESSING
            }
        }, ((err, result) => {
            db4gmo.close();
            this.logger.info('notification found.', err, result);
            const notification = result.value;
            if (err)
                return this.next(err, null, cb);
            if (!notification)
                return this.next(null, notification, cb);
            // 内容の整合性チェック
            this.logger.info('finding reservations...payment_no:', notification.order_id);
            ttts_domain_1.Models.Reservation.find({
                payment_no: notification.order_id
            }, (err, reservations) => {
                this.logger.info('reservations found.', err, reservations.length);
                if (err)
                    return this.next(err, notification, cb);
                if (reservations.length === 0)
                    return this.next(null, notification, cb);
                // チェック文字列
                const shopPassString = GMOUtil_1.default.createShopPassString(notification.shop_id, notification.order_id, notification.amount, conf.get('gmo_payment_shop_password'), moment(reservations[0].get('purchased_at')).format('YYYYMMDDHHmmss'));
                this.logger.info('shopPassString must be ', reservations[0].get('gmo_shop_pass_string'));
                if (shopPassString !== reservations[0].get('gmo_shop_pass_string')) {
                    // 不正な結果通知なので、処理済みにする
                    return this.next(null, notification, cb);
                }
                // クレジットカード決済の場合
                if (notification.pay_type === GMOUtil_1.default.PAY_TYPE_CREDIT) {
                    switch (notification.status) {
                        case GMOUtil_1.default.STATUS_CREDIT_CAPTURE:
                            // 予約完了ステータスへ変更
                            this.logger.info('updating reservations by paymentNo...', notification.order_id);
                            ttts_domain_1.Models.Reservation.update({ payment_no: notification.order_id }, {
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
                                status: ttts_domain_2.ReservationUtil.STATUS_RESERVED,
                                updated_user: 'system'
                            }, { multi: true }, (err, raw) => {
                                this.logger.info('reservations updated.', err, raw);
                                if (err)
                                    return this.next(err, notification, cb);
                                // 完了メールキュー追加(あれば更新日時を更新するだけ)
                                this.logger.info('creating reservationEmailCue...');
                                ttts_domain_1.Models.ReservationEmailCue.findOneAndUpdate({
                                    payment_no: notification.order_id,
                                    template: ttts_domain_3.ReservationEmailCueUtil.TEMPLATE_COMPLETE
                                }, {
                                    $set: { updated_at: Date.now() },
                                    $setOnInsert: { status: ttts_domain_3.ReservationEmailCueUtil.STATUS_UNSENT }
                                }, {
                                    upsert: true,
                                    new: true
                                }, (err, cue) => {
                                    this.logger.info('reservationEmailCue created.', err, cue);
                                    if (err)
                                        return this.next(err, notification, cb);
                                    // あったにせよなかったにせよ処理済に
                                    this.next(null, notification, cb);
                                });
                            });
                            break;
                        case GMOUtil_1.default.STATUS_CREDIT_UNPROCESSED:
                            // 未決済の場合、放置
                            // ユーザーが「戻る」フローでキャンセルされる、あるいは、時間経過で空席になる
                            this.next(null, notification, cb);
                            break;
                        case GMOUtil_1.default.STATUS_CREDIT_AUTHENTICATED:
                        case GMOUtil_1.default.STATUS_CREDIT_CHECK:
                            this.next(null, notification, cb);
                            break;
                        case GMOUtil_1.default.STATUS_CREDIT_AUTH:
                            this.next(null, notification, cb);
                            break;
                        case GMOUtil_1.default.STATUS_CREDIT_SALES:
                            this.next(null, notification, cb);
                            break;
                        case GMOUtil_1.default.STATUS_CREDIT_VOID:
                            // 空席に戻さない(つくったけれども、連動しない方向で仕様決定)
                            this.next(null, notification, cb);
                            break;
                        case GMOUtil_1.default.STATUS_CREDIT_RETURN:
                            this.next(null, notification, cb);
                            break;
                        case GMOUtil_1.default.STATUS_CREDIT_RETURNX:
                            this.next(null, notification, cb);
                            break;
                        case GMOUtil_1.default.STATUS_CREDIT_SAUTH:
                            this.next(null, notification, cb);
                            break;
                        default:
                            this.next(null, notification, cb);
                            break;
                    }
                }
                else if (notification.pay_type === GMOUtil_1.default.PAY_TYPE_CVS) {
                    switch (notification.status) {
                        case GMOUtil_1.default.STATUS_CVS_PAYSUCCESS:
                            // 予約完了ステータスへ変更
                            this.logger.info('updating reservations by paymentNo...', notification.order_id);
                            ttts_domain_1.Models.Reservation.update({ payment_no: notification.order_id }, {
                                status: ttts_domain_2.ReservationUtil.STATUS_RESERVED,
                                updated_user: 'system'
                            }, { multi: true }, (err, raw) => {
                                this.logger.info('reservations updated.', err, raw);
                                if (err)
                                    return this.next(err, notification, cb);
                                // 完了メールキュー追加(あれば更新日時を更新するだけ)
                                this.logger.info('creating reservationEmailCue...');
                                ttts_domain_1.Models.ReservationEmailCue.findOneAndUpdate({
                                    payment_no: notification.order_id,
                                    template: ttts_domain_3.ReservationEmailCueUtil.TEMPLATE_COMPLETE
                                }, {
                                    $set: { updated_at: Date.now() },
                                    $setOnInsert: { status: ttts_domain_3.ReservationEmailCueUtil.STATUS_UNSENT }
                                }, {
                                    upsert: true,
                                    new: true
                                }, (err, cue) => {
                                    this.logger.info('reservationEmailCue created.', err, cue);
                                    if (err)
                                        return this.next(err, notification, cb);
                                    // あったにせよなかったにせよ処理済に
                                    this.next(null, notification, cb);
                                });
                            });
                            break;
                        case GMOUtil_1.default.STATUS_CVS_REQSUCCESS:
                            // GMOパラメータを予約に追加
                            this.logger.info('updating reservations by paymentNo...', notification.order_id);
                            ttts_domain_1.Models.Reservation.update({ payment_no: notification.order_id }, {
                                gmo_shop_id: notification.shop_id,
                                gmo_amount: notification.amount,
                                gmo_tax: notification.tax,
                                gmo_cvs_code: notification.cvs_code,
                                gmo_cvs_conf_no: notification.cvs_conf_no,
                                gmo_cvs_receipt_no: notification.cvs_receipt_no,
                                gmo_payment_term: notification.payment_term,
                                updated_user: 'system'
                            }, { multi: true }, (err, raw) => {
                                this.logger.info('reservations updated.', err, raw);
                                if (err)
                                    return this.next(err, notification, cb);
                                // 仮予約完了メールキュー追加(あれば更新日時を更新するだけ)
                                this.logger.info('creating reservationEmailCue...');
                                ttts_domain_1.Models.ReservationEmailCue.findOneAndUpdate({
                                    payment_no: notification.order_id,
                                    template: ttts_domain_3.ReservationEmailCueUtil.TEMPLATE_TEMPORARY
                                }, {
                                    $set: { updated_at: Date.now() },
                                    $setOnInsert: { status: ttts_domain_3.ReservationEmailCueUtil.STATUS_UNSENT }
                                }, {
                                    upsert: true,
                                    new: true
                                }, (err, cue) => {
                                    this.logger.info('reservationEmailCue created.', err, cue);
                                    if (err)
                                        return this.next(err, notification, cb);
                                    // あったにせよなかったにせよ処理済に
                                    this.next(null, notification, cb);
                                });
                            });
                            break;
                        case GMOUtil_1.default.STATUS_CVS_UNPROCESSED:
                            this.next(null, notification, cb);
                            break;
                        case GMOUtil_1.default.STATUS_CVS_PAYFAIL: // 決済失敗
                        case GMOUtil_1.default.STATUS_CVS_CANCEL:
                            // 空席に戻す
                            this.logger.info('removing reservations...payment_no:', notification.order_id);
                            const promises = reservations.map((reservation) => {
                                return new Promise((resolve, reject) => {
                                    this.logger.info('removing reservation...', reservation.get('_id'));
                                    reservation.remove((err) => {
                                        this.logger.info('reservation removed.', reservation.get('_id'), err);
                                        (err) ? reject(err) : resolve();
                                    });
                                });
                            });
                            Promise.all(promises).then(() => {
                                // processedフラグをたてる
                                this.next(null, notification, cb);
                            }, (err) => {
                                this.next(err, notification, cb);
                            });
                            break;
                        case GMOUtil_1.default.STATUS_CVS_EXPIRED:
                            // 内部で確保する仕様の場合
                            ttts_domain_1.Models.Staff.findOne({
                                user_id: '2016sagyo2'
                            }, (err, staff) => {
                                this.logger.info('staff found.', err, staff);
                                if (err)
                                    return this.next(err, notification, cb);
                                this.logger.info('updating reservations...');
                                ttts_domain_1.Models.Reservation.update({
                                    payment_no: notification.order_id
                                }, {
                                    status: ttts_domain_2.ReservationUtil.STATUS_RESERVED,
                                    purchaser_group: ttts_domain_2.ReservationUtil.PURCHASER_GROUP_STAFF,
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
                                }, (err, raw) => {
                                    this.logger.info('updated.', err, raw);
                                    this.next(err, notification, cb);
                                });
                            });
                            // 何もしない仕様の場合
                            // this.next(null, notification, cb);
                            break;
                        default:
                            this.next(null, notification, cb);
                            break;
                    }
                }
                else {
                    // 他の決済は本案件では非対応
                    return this.next(null, notification, cb);
                }
            });
        }));
    }
    /**
     * プロセスを終了する
     *
     * @param {Object} notification
     */
    next(err, notification, cb) {
        if (!notification)
            return cb();
        const status = (err) ? ttts_domain_4.GMONotificationUtil.PROCESS_STATUS_UNPROCESSED : ttts_domain_4.GMONotificationUtil.PROCESS_STATUS_PROCESSED;
        // processedフラグをたてる
        this.logger.info('setting process_status...', status);
        const db4gmo = mongoose.createConnection(MONGOLAB_URI_FOR_GMO);
        notification.process_status = status;
        db4gmo.collection('gmo_notifications').findOneAndUpdate({
            _id: notification._id
        }, {
            $set: {
                process_status: status
            }
        }, (err, result) => {
            this.logger.info('notification saved.', err, result);
            db4gmo.close();
            cb();
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GMOController;
