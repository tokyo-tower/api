/**
 * パフォーマンスコントローラー
 *
 * @namespace api/PerformanceController
 */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    return __awaiter(this, void 0, void 0, function* () {
        const limit = (req.query.limit !== undefined) ? parseInt(req.query.limit, DEFAULT_RADIX) : null;
        const page = (req.query.page !== undefined) ? parseInt(req.query.page, DEFAULT_RADIX) : 1;
        const day = (req.query.day !== undefined) ? req.query.day : null; // 上映日
        const section = (req.query.section !== undefined) ? req.query.section : null; // 部門
        const words = (req.query.words !== undefined) ? req.query.words : null; // フリーワード
        // この時間以降開始のパフォーマンスに絞る(timestamp milliseconds)
        const startFrom = (req.query.start_from !== undefined) ? parseInt(req.query.start_from, DEFAULT_RADIX) : null;
        const theater = (req.query.theater !== undefined) ? req.query.theater : null; // 劇場
        const screen = (req.query.screen !== undefined) ? req.query.screen : null; // スクリーン
        // 検索条件を作成
        let andConditions = [
            { canceled: false }
        ];
        if (day !== null) {
            andConditions.push({
                day: day
            });
        }
        if (theater !== null) {
            andConditions.push({
                theater: theater
            });
        }
        if (screen !== null) {
            andConditions.push({
                screen: screen
            });
        }
        if (startFrom !== null) {
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
        try {
            andConditions = yield addFilmConditions(andConditions, section, words);
            let conditions = null;
            if (andConditions.length > 0) {
                conditions = {
                    $and: andConditions
                };
            }
            // 作品件数取得
            const filmIds = yield chevre_domain_1.Models.Performance.distinct('film', conditions).exec();
            // 総数検索
            const performancesCount = yield chevre_domain_1.Models.Performance.count(conditions).exec();
            // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
            let fields = '';
            if (req.getLocale() === 'ja') {
                fields = 'day open_time start_time film screen screen_name.ja theater theater_name.ja';
            }
            else {
                fields = 'day open_time start_time film screen screen_name.en theater theater_name.en';
            }
            const query = chevre_domain_1.Models.Performance.find(conditions, fields);
            if (limit !== null) {
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
            const performances = yield query.lean(true).exec();
            // 空席情報を追加
            chevre_domain_1.PerformanceStatusesModel.find((findPerformanceStatusesErr, performanceStatuses) => {
                if (findPerformanceStatusesErr instanceof Error) {
                    console.error(findPerformanceStatusesErr);
                }
                const results = performances.map((performance) => {
                    return {
                        _id: performance._id,
                        day: performance.day,
                        open_time: performance.open_time,
                        start_time: performance.start_time,
                        seat_status: (performanceStatuses !== undefined) ? performanceStatuses.getStatus(performance._id.toString()) : null,
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
        }
        catch (error) {
            res.json({
                success: false,
                results: [],
                performances_count: 0,
                films_count: 0
            });
        }
    });
}
exports.search = search;
function addFilmConditions(andConditions, section, words) {
    return __awaiter(this, void 0, void 0, function* () {
        const filmAndConditions = [];
        if (section !== null) {
            // 部門条件の追加
            filmAndConditions.push({
                'sections.code': { $in: [section] }
            });
        }
        // フリーワードの検索対象はタイトル(日英両方)
        // 空白つなぎでOR検索
        if (words !== null) {
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
            try {
                const filmIds = yield chevre_domain_1.Models.Film.distinct('_id', filmConditions).exec();
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
                return andConditions;
            }
            catch (error) {
                // 検索結果のない条件を追加
                andConditions.push({
                    film: null
                });
                throw error;
            }
        }
        else {
            // 全作品数を取得
            return andConditions;
        }
    });
}
