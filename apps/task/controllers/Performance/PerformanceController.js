"use strict";
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const BaseController_1 = require("../BaseController");
const conf = require("config");
const fs = require("fs-extra");
const mongoose = require("mongoose");
const MONGOLAB_URI = conf.get('mongolab_uri');
const DEFAULT_RADIX = 10;
/**
 * パフォーマンスタスクコントローラー
 *
 * @export
 * @class PerformanceController
 * @extends {BaseController}
 */
class PerformanceController extends BaseController_1.default {
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/performances.json`, 'utf8', (readFileErr, data) => {
            if (readFileErr)
                throw readFileErr;
            const performances = JSON.parse(data);
            ttts_domain_1.Models.Screen.find({}, 'name theater').populate('theater', 'name').exec((err, screens) => {
                if (err)
                    throw err;
                // あれば更新、なければ追加
                const promises = performances.map((performance) => {
                    return new Promise((resolve, reject) => {
                        // 劇場とスクリーン名称を追加
                        const screenOfPerformance = screens.find((screen) => {
                            return (screen.get('_id').toString() === performance.screen);
                        });
                        if (!screenOfPerformance)
                            return reject(new Error('screen not found.'));
                        performance.screen_name = screenOfPerformance.get('name');
                        performance.theater_name = screenOfPerformance.get('theater').get('name');
                        this.logger.debug('updating performance...');
                        ttts_domain_1.Models.Performance.findOneAndUpdate({ _id: performance._id }, performance, {
                            new: true,
                            upsert: true
                        }, (updateErr) => {
                            this.logger.debug('performance updated', updateErr);
                            (updateErr) ? reject(updateErr) : resolve();
                        });
                    });
                });
                Promise.all(promises).then(() => {
                    this.logger.info('promised.');
                    mongoose.disconnect();
                    process.exit(0);
                }, (promiseErr) => {
                    this.logger.error('promised.', promiseErr);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    /**
     * 空席ステータスを更新する
     */
    updateStatuses() {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('finding performances...');
        ttts_domain_1.Models.Performance.find({}, 'day start_time screen')
            .populate('screen', 'seats_number')
            .exec((err, performances) => {
            this.logger.info('performances found.', err);
            if (err) {
                mongoose.disconnect();
                process.exit(0);
                return;
            }
            const performanceStatusesModel = ttts_domain_1.PerformanceStatusesModel.create();
            this.logger.info('aggregating...');
            ttts_domain_1.Models.Reservation.aggregate([
                {
                    $group: {
                        _id: '$performance',
                        count: { $sum: 1 }
                    }
                }
            ], (aggregateErr, results) => {
                this.logger.info('aggregated.', aggregateErr);
                if (aggregateErr) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                // パフォーマンスIDごとに
                const reservationNumbers = {};
                results.forEach((result) => {
                    reservationNumbers[result._id] = parseInt(result.count, DEFAULT_RADIX);
                });
                performances.forEach((performance) => {
                    // パフォーマンスごとに空席ステータスを算出する
                    if (!reservationNumbers.hasOwnProperty(performance.get('_id').toString())) {
                        reservationNumbers[performance.get('_id').toString()] = 0;
                    }
                    // TODO anyで逃げているが、型定義をちゃんとかけばもっとよく書ける
                    const status = performance.getSeatStatus(reservationNumbers[performance.get('_id').toString()]);
                    performanceStatusesModel.setStatus(performance._id.toString(), status);
                });
                this.logger.info('saving performanceStatusesModel...', performanceStatusesModel);
                ttts_domain_1.PerformanceStatusesModel.store(performanceStatusesModel, (storeErr) => {
                    this.logger.info('performanceStatusesModel saved.', storeErr);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    /**
     * ID指定でパフォーマンスを公開する
     */
    release(performanceId) {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('updating performance..._id:', performanceId);
        ttts_domain_1.Models.Performance.findOneAndUpdate({
            _id: performanceId
        }, {
            canceled: false
        }, {
            new: true
        }, (err, performance) => {
            this.logger.info('performance updated', err, performance);
            mongoose.disconnect();
            process.exit(0);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceController;
