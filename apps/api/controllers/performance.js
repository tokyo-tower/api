/**
 * パフォーマンスコントローラー
 *
 * @namespace api/PerformanceController
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevre_domain_1 = require("@motionpicture/chevre-domain");
const moment = require("moment");
const DEFAULT_RADIX = 10;
/**
 * 検索する
 *
 * @memberOf api/PerformanceController
 */
function search(req, res) {
    const limit = (req.query.limit) ? parseInt(req.query.limit, DEFAULT_RADIX) : null;
    const page = (req.query.page) ? parseInt(req.query.page, DEFAULT_RADIX) : 1;
    const day = (req.query.day) ? req.query.day : null; // 上映日
    const section = (req.query.section) ? req.query.section : null; // 部門
    const words = (req.query.words) ? req.query.words : null; // フリーワード
    const startFrom = (req.query.start_from) ? parseInt(req.query.start_from, DEFAULT_RADIX) : null; // この時間以降開始のパフォーマンスに絞る(timestamp milliseconds)
    const theater = (req.query.theater) ? req.query.theater : null; // 劇場
    const screen = (req.query.screen) ? req.query.screen : null; // スクリーン
    // 検索条件を作成
    const andConditions = [
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
        let conditions = null;
        if (andConditions.length > 0) {
            conditions = {
                $and: andConditions
            };
        }
        // 作品件数取得
        chevre_domain_1.Models.Performance.distinct('film', conditions, (distinctErr, filmIds) => {
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
            chevre_domain_1.Models.Performance.count(conditions, (countErr, performancesCount) => {
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
                }
                else {
                    fields = 'day open_time start_time film screen screen_name.en theater theater_name.en';
                }
                const query = chevre_domain_1.Models.Performance.find(conditions, fields);
                if (limit) {
                    query.skip(limit * (page - 1)).limit(limit);
                }
                if (req.getLocale() === 'ja') {
                    query.populate('film', 'name.ja sections.name.ja minutes copyright');
                }
                else {
                    query.populate('film', 'name.en sections.name.en minutes copyright');
                }
                // 上映日、開始時刻
                query.setOptions({
                    sort: {
                        day: 1,
                        start_time: 1
                    }
                });
                query.lean(true).exec((findPerformancesErr, performances) => {
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
                    chevre_domain_1.PerformanceStatusesModel.find((findPerformanceStatusesErr, performanceStatuses) => {
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
                                film_sections: performance.film.sections.map((filmSection) => filmSection.name[req.getLocale()]),
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
            });
        });
    });
}
exports.search = search;
function addFilmConditions(andConditions, section, words, cb) {
    const filmAndConditions = [];
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
            orConditions.push({
                'name.ja': { $regex: `${regex}` }
            }, {
                'name.en': { $regex: `${regex}` }
            });
        }
        filmAndConditions.push({
            $or: orConditions
        });
    }
    if (filmAndConditions.length > 0) {
        const filmConditions = {
            $and: filmAndConditions
        };
        chevre_domain_1.Models.Film.distinct('_id', filmConditions, (err, filmIds) => {
            if (err) {
                // 検索結果のない条件を追加
                andConditions.push({
                    film: null
                });
                cb(err, andConditions);
            }
            else {
                if (filmIds.length > 0) {
                    andConditions.push({
                        film: {
                            $in: filmIds
                        }
                    });
                }
                else {
                    // 検索結果のない条件を追加
                    andConditions.push({
                        film: null
                    });
                }
                cb(null, andConditions);
            }
        });
    }
    else {
        // 全作品数を取得
        cb(null, andConditions);
    }
}
