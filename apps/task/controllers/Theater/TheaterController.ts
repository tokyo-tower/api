import { Models } from '@motionpicture/ttts-domain';
import { ScreenUtil } from '@motionpicture/ttts-domain';
import BaseController from '../BaseController';
import * as conf from 'config';
import * as mongoose from 'mongoose';
import * as fs from 'fs-extra';

const MONGOLAB_URI = conf.get<string>('mongolab_uri');

/**
 * 劇場タスクコントローラー
 *
 * @export
 * @class TheaterController
 * @extends {BaseController}
 */
export default class TheaterController extends BaseController {
    public createScreensFromJson(): void {
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
                    seatsNumbersBySeatCode[seat.grade.code]++;
                });
                screen.seats_numbers_by_seat_grade = Object.keys(seatsNumbersBySeatCode).map((seatGradeCode) => {
                    return {
                        seat_grade_code: seatGradeCode,
                        seats_number: seatsNumbersBySeatCode[seatGradeCode]
                    };
                });


                return new Promise((resolve, reject) => {
                    this.logger.debug('updating screen...');
                    Models.Screen.findOneAndUpdate(
                        {
                            _id: screen._id
                        },
                        screen,
                        {
                            new: true,
                            upsert: true
                        },
                        (err) => {
                            this.logger.debug('screen updated', err);
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
    }

    public createFromJson(): void {
        mongoose.connect(MONGOLAB_URI, {});

        fs.readFile(`${process.cwd()}/data/${process.env.NODE_ENV}/theaters.json`, 'utf8', (err, data) => {
            if (err) throw err;
            const theaters: any[] = JSON.parse(data);

            const promises = theaters.map((theater) => {
                return new Promise((resolve, reject) => {
                    this.logger.debug('updating theater...');
                    Models.Theater.findOneAndUpdate(
                        {
                            _id: theater._id
                        },
                        theater,
                        {
                            new: true,
                            upsert: true
                        },
                        (err) => {
                            this.logger.debug('theater updated', err);
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
    }
}
