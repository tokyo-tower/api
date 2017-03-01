/**
 * パフォーマンスコントローラー
 *
 * @namespace api/PerformanceController
 */

import { Models, PerformanceStatusesModel } from '@motionpicture/chevre-domain';

import { Request, Response } from 'express';
import * as moment from 'moment';

const DEFAULT_RADIX = 10;

/**
 * 検索する
 *
 * @memberOf api/PerformanceController
 */
export function search(req: Request, res: Response): void {
    const limit: number | null = (req.query.limit) ? parseInt(req.query.limit, DEFAULT_RADIX) : null;
    const page: number = (req.query.page) ? parseInt(req.query.page, DEFAULT_RADIX) : 1;

    const day: string = (req.query.day) ? req.query.day : null; // 上映日
    const section: string = (req.query.section) ? req.query.section : null; // 部門
    const words: string = (req.query.words) ? req.query.words : null; // フリーワード
    const startFrom: number | null = (req.query.start_from) ? parseInt(req.query.start_from, DEFAULT_RADIX) : null; // この時間以降開始のパフォーマンスに絞る(timestamp milliseconds)
    const theater: string = (req.query.theater) ? req.query.theater : null; // 劇場
    const screen: string = (req.query.screen) ? req.query.screen : null; // スクリーン

    // 検索条件を作成
    const andConditions: any[] = [
        { canceled: false }
    ];

    if (day) {
        andConditions.push({
            day: day
        });
    }

    if (theater) {
        andConditions.push({
            theater: theater
        });
    }

    if (screen) {
        andConditions.push({
            screen: screen
        });
    }

    if (startFrom) {
        const now = moment(startFrom);
        // tslint:disable-next-line:no-magic-numbers
        const tomorrow = moment(startFrom).add(+24, 'hours');

        andConditions.push({
            $or: [
                {
                    day: now.format('YYYYMMDD'),
                    start_time: {
                        $gte: now.format('HHmm')
                    }
                },
                {
                    day: {
                        $gte: tomorrow.format('YYYYMMDD')
                    }
                }
            ]
        });
    }

    // 作品条件を追加する
    // tslint:disable-next-line:max-func-body-length no-shadowed-variable
    addFilmConditions(andConditions, section, words, (err, andConditions) => {
        if (err) {
            res.json({
                success: false,
                results: [],
                performances_count: 0,
                films_count: 0
            });
            return;
        }

        let conditions: any = null;
        if (andConditions.length > 0) {
            conditions = {
                $and: andConditions
            };
        }

        // 作品件数取得
        Models.Performance.distinct('film', conditions, (distinctErr, filmIds) => {
            if (distinctErr) {
                res.json({
                    success: false,
                    results: [],
                    performances_count: 0,
                    films_count: 0
                });
                return;
            }

            // 総数検索
            Models.Performance.count(
                conditions,
                (countErr, performancesCount) => {
                    if (countErr) {
                        res.json({
                            success: false,
                            results: [],
                            performances_count: 0,
                            films_count: 0
                        });
                        return;
                    }

                    // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
                    let fields = '';
                    if (req.getLocale() === 'ja') {
                        fields = 'day open_time start_time film screen screen_name.ja theater theater_name.ja';
                    } else {
                        fields = 'day open_time start_time film screen screen_name.en theater theater_name.en';
                    }
                    const query = Models.Performance.find(
                        conditions,
                        fields
                    );

                    if (limit) {
                        query.skip(limit * (page - 1)).limit(limit);
                    }

                    if (req.getLocale() === 'ja') {
                        query.populate('film', 'name.ja sections.name.ja minutes copyright');
                    } else {
                        query.populate('film', 'name.en sections.name.en minutes copyright');
                    }

                    // 上映日、開始時刻
                    query.setOptions({
                        sort: {
                            day: 1,
                            start_time: 1
                        }
                    });

                    query.lean(true).exec((findPerformancesErr, performances: any[]) => {
                        if (findPerformancesErr) {
                            res.json({
                                success: false,
                                results: [],
                                performances_count: 0,
                                films_count: 0
                            });
                            return;
                        }

                        // 空席情報を追加
                        PerformanceStatusesModel.find((findPerformanceStatusesErr, performanceStatuses) => {
                            if (findPerformanceStatusesErr) {
                                console.error(findPerformanceStatusesErr);
                            }

                            const results = performances.map((performance) => {
                                return {
                                    _id: performance._id,
                                    day: performance.day,
                                    open_time: performance.open_time,
                                    start_time: performance.start_time,
                                    seat_status: (performanceStatuses) ? performanceStatuses.getStatus(performance._id.toString()) : null,
                                    theater_name: performance.theater_name[req.getLocale()],
                                    screen_name: performance.screen_name[req.getLocale()],
                                    film_id: performance.film._id,
                                    film_name: performance.film.name[req.getLocale()],
                                    film_sections: performance.film.sections.map((filmSection: any) => filmSection.name[req.getLocale()]),
                                    film_minutes: performance.film.minutes,
                                    film_copyright: performance.film.copyright,
                                    film_image: `${process.env.FRONTEND_ENDPOINT}/images/film/${performance.film._id}.jpg`
                                };
                            });

                            res.json({
                                success: true,
                                results: results,
                                performances_count: performancesCount,
                                films_count: filmIds.length
                            });
                        });
                    });
                }
            );
        });
    });
}

function addFilmConditions(andConditions: any[], section: string, words: string, cb: (err: Error | null, andConditions: any[]) => void) {
    const filmAndConditions: any[] = [];
    if (section) {
        // 部門条件の追加
        filmAndConditions.push({
            'sections.code': { $in: [section] }
        });
    }

    // フリーワードの検索対象はタイトル(日英両方)
    // 空白つなぎでOR検索
    if (words) {
        // trim and to half-width space
        words = words.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
        const regexes = words.split(' ').filter((value) => (value.length > 0));

        const orConditions = [];
        for (const regex of regexes) {
            orConditions.push(
                {
                    'name.ja': { $regex: `${regex}` }
                },
                {
                    'name.en': { $regex: `${regex}` }
                }
            );
        }

        filmAndConditions.push({
            $or: orConditions
        });
    }

    if (filmAndConditions.length > 0) {
        const filmConditions = {
            $and: filmAndConditions
        };

        Models.Film.distinct(
            '_id',
            filmConditions,
            (err, filmIds) => {
                if (err) {
                    // 検索結果のない条件を追加
                    andConditions.push({
                        film: null
                    });

                    cb(err, andConditions);
                } else {
                    if (filmIds.length > 0) {
                        andConditions.push({
                            film: {
                                $in: filmIds
                            }
                        });
                    } else {
                        // 検索結果のない条件を追加
                        andConditions.push({
                            film: null
                        });
                    }

                    cb(null, andConditions);
                }
            }
        );
    } else {
        // 全作品数を取得
        cb(null, andConditions);
    }
}
