/**
 * 劇場タスクコントローラー
 *
 * @namespace task/TheaterController
 */

import { Models } from '@motionpicture/chevre-domain';
import { ScreenUtil } from '@motionpicture/chevre-domain';

import * as conf from 'config';
import * as fs from 'fs-extra';
import * as log4js from 'log4js';
import * as mongoose from 'mongoose';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

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
 * @memberOf task/TheaterController
 */
export function createScreensFromJson(): void {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/screens.json`, 'utf8', (err, data) => {
        if (err) throw err;
        const screens: any[] = JSON.parse(data);

        const promises = screens.map((screen) => {
            // 座席数情報を追加
            screen.seats_number = screen.sections[0].seats.length;

            // 座席グレードごとの座席数情報を追加
            const seatsNumbersBySeatCode: {
                [key: string]: number
            } = {};
            seatsNumbersBySeatCode[ScreenUtil.SEAT_GRADE_CODE_NORMAL] = 0;
            seatsNumbersBySeatCode[ScreenUtil.SEAT_GRADE_CODE_PREMIERE_BOX] = 0;
            seatsNumbersBySeatCode[ScreenUtil.SEAT_GRADE_CODE_PREMIERE_LUXURY] = 0;
            seatsNumbersBySeatCode[ScreenUtil.SEAT_GRADE_CODE_FRONT_RECLINING] = 0;
            screen.sections[0].seats.forEach((seat: any) => {
                seatsNumbersBySeatCode[seat.grade.code] += 1;
            });
            screen.seats_numbers_by_seat_grade = Object.keys(seatsNumbersBySeatCode).map((seatGradeCode) => {
                return {
                    seat_grade_code: seatGradeCode,
                    seats_number: seatsNumbersBySeatCode[seatGradeCode]
                };
            });

            return new Promise((resolve, reject) => {
                logger.debug('updating screen...');
                Models.Screen.findOneAndUpdate(
                    {
                        _id: screen._id
                    },
                    screen,
                    {
                        new: true,
                        upsert: true
                    },
                    (updateErr) => {
                        logger.debug('screen updated', updateErr);
                        (err) ? reject(err) : resolve();
                    }
                );
            });
        });

        Promise.all(promises).then(
            () => {
                logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            },
            (promiseErr) => {
                logger.error('promised.', promiseErr);
                mongoose.disconnect();
                process.exit(0);
            }
        );
    });
}

/**
 *
 * @memberOf task/TheaterController
 */
export function createFromJson(): void {
    mongoose.connect(MONGOLAB_URI, {});

    fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/theaters.json`, 'utf8', (err, data) => {
        if (err) throw err;
        const theaters: any[] = JSON.parse(data);

        const promises = theaters.map((theater) => {
            return new Promise((resolve, reject) => {
                logger.debug('updating theater...');
                Models.Theater.findOneAndUpdate(
                    {
                        _id: theater._id
                    },
                    theater,
                    {
                        new: true,
                        upsert: true
                    },
                    (updateErr) => {
                        logger.debug('theater updated', updateErr);
                        (err) ? reject(err) : resolve();
                    }
                );
            });
        });

        Promise.all(promises).then(
            () => {
                logger.info('promised.');
                mongoose.disconnect();
                process.exit(0);
            },
            (promiseErr) => {
                logger.error('promised.', promiseErr);
                mongoose.disconnect();
                process.exit(0);
            }
        );
    });
}
