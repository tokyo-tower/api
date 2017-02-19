import BaseController from '../BaseController';
import * as conf from 'config';
import * as mongoose from 'mongoose';
import * as fs from 'fs-extra';
import { Models, PerformanceStatusesModel } from '@motionpicture/ttts-domain';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

/**
 * パフォーマンスタスクコントローラー
 *
 * @export
 * @class PerformanceController
 * @extends {BaseController}
 */
export default class PerformanceController extends BaseController {
    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/performances.json`, 'utf8', (err, data) => {
            if (err) throw err;
            const performances: any[] = JSON.parse(data);

            Models.Screen.find({}, 'name theater').populate('theater', 'name').exec((err, screens) => {
                if (err) throw err;

                // あれば更新、なければ追加
                const promises = performances.map((performance) => {
                    return new Promise((resolve, reject) => {
                        // 劇場とスクリーン名称を追加
                        const _screen = screens.find((screen) => {
                            return (screen.get('_id').toString() === performance.screen);
                        });
                        if (!_screen) return reject(new Error('screen not found.'));

                        performance.screen_name = _screen.get('name');
                        performance.theater_name = _screen.get('theater').get('name');

                        this.logger.debug('updating performance...');
                        Models.Performance.findOneAndUpdate(
                            { _id: performance._id },
                            performance,
                            {
                                new: true,
                                upsert: true
                            },
                            (err) => {
                                this.logger.debug('performance updated', err);
                                (err) ? reject(err) : resolve();
                            }
                        );
                    });
                });

                Promise.all(promises).then(() => {
                    this.logger.info('promised.');
                    mongoose.disconnect();
                    process.exit(0);
                },                         (err) => {
                    this.logger.error('promised.', err);
                    mongoose.disconnect();
                    process.exit(0);
                });
            });
        });
    }

    /**
     * 空席ステータスを更新する
     */
    public updateStatuses() {
        mongoose.connect(MONGOLAB_URI, {});

        this.logger.info('finding performances...');
        Models.Performance.find(
            {},
            'day start_time screen'
        )
            .populate('screen', 'seats_number')
            .exec((err, performances) => {
                this.logger.info('performances found.', err);
                if (err) {
                    mongoose.disconnect();
                    process.exit(0);
                    return;
                }

                const performanceStatusesModel = PerformanceStatusesModel.create();

                this.logger.info('aggregating...');
                Models.Reservation.aggregate(
                    [
                        {
                            $group: {
                                _id: '$performance',
                                count: { $sum: 1 }
                            }
                        }
                    ],
                    (err: any, results: any[]) => {
                        this.logger.info('aggregated.', err);
                        if (err) {
                            mongoose.disconnect();
                            process.exit(0);
                            return;
                        }

                        // パフォーマンスIDごとに
                        const reservationNumbers: {
                            [key: string]: number
                        } = {};
                        for (const result of results) {
                            reservationNumbers[result._id] = parseInt(result.count);
                        }

                        performances.forEach((performance) => {
                            // パフォーマンスごとに空席ステータスを算出する
                            if (!reservationNumbers.hasOwnProperty(performance.get('_id').toString())) {
                                reservationNumbers[performance.get('_id').toString()] = 0;
                            }

                            // TODO anyで逃げているが、型定義をちゃんとかけばもっとよく書ける
                            const status = (<any>performance)['getSeatStatus'](reservationNumbers[performance.get('_id').toString()]);
                            performanceStatusesModel.setStatus(performance._id.toString(), status);
                        });

                        this.logger.info('saving performanceStatusesModel...', performanceStatusesModel);
                        PerformanceStatusesModel.store(performanceStatusesModel, (err) => {
                            this.logger.info('performanceStatusesModel saved.', err);
                            mongoose.disconnect();
                            process.exit(0);
                        });
                    }
                );
            });
    }

    /**
     * ID指定でパフォーマンスを公開する
     */
    public release(performanceId: string): void {
        mongoose.connect(MONGOLAB_URI, {});

        this.logger.info('updating performance..._id:', performanceId);
        Models.Performance.findOneAndUpdate({
            _id: performanceId
        },                                  {
                canceled: false
            },                              {
                new: true
            },                              (err, performance) => {
                this.logger.info('performance updated', err, performance);
                mongoose.disconnect();
                process.exit(0);
            }
        );
    }
}
