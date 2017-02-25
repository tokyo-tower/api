/**
 * パフォーマンスタスクコントローラー
 *
 * @namespace task/PerformanceController
 */
"use strict";
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const conf = require("config");
const fs = require("fs-extra");
const log4js = require("log4js");
const mongoose = require("mongoose");
const MONGOLAB_URI = conf.get('mongolab_uri');
const DEFAULT_RADIX = 10;
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
 *
 *
 * @memberOf task/PerformanceController
 */
function createFromJson() {
    mongoose.connect(MONGOLAB_URI, {});
    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/performances.json`, 'utf8', (readFileErr, data) => {
        if (readFileErr)
            throw readFileErr;
        const performances = JSON.parse(data);
        chevre_domain_1.Models.Screen.find({}, 'name theater').populate('theater', 'name').exec((err, screens) => {
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
                    logger.debug('updating performance...');
                    chevre_domain_1.Models.Performance.findOneAndUpdate({ _id: performance._id }, performance, {
                        new: true,
                        upsert: true
                    }, (updateErr) => {
                        logger.debug('performance updated', updateErr);
                        (updateErr) ? reject(updateErr) : resolve();
                    });
                });
            });
            Promise.all(promises).then(() => {
                logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            }, (promiseErr) => {
                logger.error('promised.', promiseErr);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    });
}
exports.createFromJson = createFromJson;
/**
 * 空席ステータスを更新する
 *
 * @memberOf task/PerformanceController
 */
function updateStatuses() {
    mongoose.connect(MONGOLAB_URI, {});
    logger.info('finding performances...');
    chevre_domain_1.Models.Performance.find({}, 'day start_time screen')
        .populate('screen', 'seats_number')
        .exec((err, performances) => {
        logger.info('performances found.', err);
        if (err) {
            mongoose.disconnect();
            process.exit(0);
            return;
        }
        const performanceStatusesModel = chevre_domain_1.PerformanceStatusesModel.create();
        logger.info('aggregating...');
        chevre_domain_1.Models.Reservation.aggregate([
            {
                $group: {
                    _id: '$performance',
                    count: { $sum: 1 }
                }
            }
        ], (aggregateErr, results) => {
            logger.info('aggregated.', aggregateErr);
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
            logger.info('saving performanceStatusesModel...', performanceStatusesModel);
            chevre_domain_1.PerformanceStatusesModel.store(performanceStatusesModel, (storeErr) => {
                logger.info('performanceStatusesModel saved.', storeErr);
                mongoose.disconnect();
                process.exit(0);
            });
        });
    });
}
exports.updateStatuses = updateStatuses;
/**
 * ID指定でパフォーマンスを公開する
 *
 * @memberOf task/PerformanceController
 */
function release(performanceId) {
    mongoose.connect(MONGOLAB_URI, {});
    logger.info('updating performance..._id:', performanceId);
    chevre_domain_1.Models.Performance.findOneAndUpdate({
        _id: performanceId
    }, {
        canceled: false
    }, {
        new: true
    }, (err, performance) => {
        logger.info('performance updated', err, performance);
        mongoose.disconnect();
        process.exit(0);
    });
}
exports.release = release;
