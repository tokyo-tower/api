"use strict";
const BaseController_1 = require("../BaseController");
const conf = require("config");
const mongoose = require("mongoose");
const fs = require("fs-extra");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
let MONGOLAB_URI = conf.get('mongolab_uri');
class PerformanceController extends BaseController_1.default {
    createFromJson() {
        mongoose.connect(MONGOLAB_URI, {});
        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/performances.json`, 'utf8', (err, data) => {
            if (err)
                throw err;
            let performances = JSON.parse(data);
            ttts_domain_1.Models.Screen.find({}, 'name theater').populate('theater', 'name').exec((err, screens) => {
                if (err)
                    throw err;
                let promises = performances.map((performance) => {
                    return new Promise((resolve, reject) => {
                        let _screen = screens.find((screen) => {
                            return (screen.get('_id').toString() === performance.screen);
                        });
                        if (!_screen)
                            return reject(new Error("screen not found."));
                        performance.screen_name = _screen.get('name');
                        performance.theater_name = _screen.get('theater').get('name');
                        this.logger.debug('updating performance...');
                        ttts_domain_1.Models.Performance.findOneAndUpdate({ _id: performance._id }, performance, {
                            new: true,
                            upsert: true
                        }, (err) => {
                            this.logger.debug('performance updated', err);
                            (err) ? reject(err) : resolve();
                        });
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
        });
    }
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
            let performanceStatusesModel = ttts_domain_1.PerformanceStatusesModel.create();
            this.logger.info('aggregating...');
            ttts_domain_1.Models.Reservation.aggregate([
                {
                    $group: {
                        _id: "$performance",
                        count: { $sum: 1 }
                    }
                }
            ], (err, results) => {
                this.logger.info('aggregated.', err);
                if (err) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }
                let reservationNumbers = {};
                for (let result of results) {
                    reservationNumbers[result._id] = parseInt(result.count);
                }
                performances.forEach((performance) => {
                    if (!reservationNumbers.hasOwnProperty(performance.get('_id').toString())) {
                        reservationNumbers[performance.get('_id').toString()] = 0;
                    }
                    let status = performance['getSeatStatus'](reservationNumbers[performance.get('_id').toString()]);
                    performanceStatusesModel.setStatus(performance._id.toString(), status);
                });
                this.logger.info('saving performanceStatusesModel...', performanceStatusesModel);
                ttts_domain_1.PerformanceStatusesModel.store(performanceStatusesModel, (err) => {
                    this.logger.info('performanceStatusesModel saved.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }
    release(performanceId) {
        mongoose.connect(MONGOLAB_URI, {});
        this.logger.info('updating performance..._id:', performanceId);
        ttts_domain_1.Models.Performance.findOneAndUpdate({
            _id: performanceId
        }, {
            canceled: false
        }, {
            new: true,
        }, (err, performance) => {
            this.logger.info('performance updated', err, performance);
            mongoose.disconnect();
            process.exit(0);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceController;
