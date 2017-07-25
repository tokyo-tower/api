"use strict";
/**
 * パフォーマンスコントローラー
 *
 * @namespace controllers/performance
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ttts = require("@motionpicture/ttts-domain");
const createDebug = require("debug");
const moment = require("moment");
const debug = createDebug('ttts-api:controller:performance');
/**
 * 検索する
 *
 * @param {ISearchConditions} searchConditions 検索条件
 * @return {ISearchResult} 検索結果
 * @memberof controllers/performance
 */
// tslint:disable-next-line:max-func-body-length
function search(searchConditions) {
    return __awaiter(this, void 0, void 0, function* () {
        // MongoDB検索条件を作成
        const andConditions = [
            { canceled: false }
        ];
        if (searchConditions.day !== undefined) {
            andConditions.push({ day: searchConditions.day });
        }
        if (searchConditions.theater !== undefined) {
            andConditions.push({ theater: searchConditions.theater });
        }
        if (searchConditions.screen !== undefined) {
            andConditions.push({ screen: searchConditions.screen });
        }
        if (searchConditions.startFrom !== undefined) {
            const now = moment(searchConditions.startFrom);
            // tslint:disable-next-line:no-magic-numbers
            const tomorrow = moment(searchConditions.startFrom).add(+24, 'hours');
            andConditions.push({
                $or: [
                    {
                        day: now.format('YYYYMMDD'),
                        start_time: { $gte: now.format('HHmm') }
                    },
                    {
                        day: { $gte: tomorrow.format('YYYYMMDD') }
                    }
                ]
            });
        }
        // 作品条件を追加する
        yield addFilmConditions(andConditions, (searchConditions.section !== undefined) ? searchConditions.section : null, (searchConditions.words !== undefined) ? searchConditions.words : null);
        let conditions = null;
        if (andConditions.length > 0) {
            conditions = { $and: andConditions };
        }
        // 作品件数取得
        const filmIds = yield ttts.Models.Performance.distinct('film', conditions).exec();
        // 総数検索
        const performancesCount = yield ttts.Models.Performance.count(conditions).exec();
        // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
        const fields = 'day open_time start_time end_time film screen screen_name theater theater_name';
        const query = ttts.Models.Performance.find(conditions, fields);
        const page = (searchConditions.page !== undefined) ? searchConditions.page : 1;
        if (searchConditions.limit !== undefined) {
            query.skip(searchConditions.limit * (page - 1)).limit(searchConditions.limit);
        }
        query.populate('film', 'name sections.name minutes copyright');
        // 上映日、開始時刻
        query.setOptions({
            sort: {
                day: 1,
                start_time: 1
            }
        });
        const performances = yield query.lean(true).exec();
        // 空席情報を追加
        const performanceStatuses = yield ttts.PerformanceStatusesModel.find().catch(() => undefined);
        const getStatus = (id) => {
            if (performanceStatuses !== undefined && performanceStatuses.hasOwnProperty(id)) {
                return performanceStatuses[id];
            }
            return null;
        };
        const data = performances.map((performance) => {
            return {
                type: 'performances',
                id: performance._id,
                attributes: {
                    day: performance.day,
                    open_time: performance.open_time,
                    start_time: performance.start_time,
                    end_time: performance.end_time,
                    seat_status: getStatus(performance._id.toString()),
                    theater_name: performance.theater_name,
                    screen_name: performance.screen_name,
                    film: performance.film._id,
                    film_name: performance.film.name,
                    film_sections: performance.film.sections.map((filmSection) => filmSection.name),
                    film_minutes: performance.film.minutes,
                    film_copyright: performance.film.copyright,
                    film_image: `${process.env.FRONTEND_ENDPOINT}/images/film/${performance.film._id}.jpg`
                }
            };
        });
        return {
            performances: data,
            numberOfPerformances: performancesCount,
            filmIds: filmIds
        };
    });
}
exports.search = search;
/**
 * 作品に関する検索条件を追加する
 *
 * @param andConditions パフォーマンス検索条件
 * @param section 作品部門
 * @param words フリーワード
 */
function addFilmConditions(andConditions, section, words) {
    return __awaiter(this, void 0, void 0, function* () {
        const filmAndConditions = [];
        if (section !== null) {
            // 部門条件の追加
            filmAndConditions.push({ 'sections.code': { $in: [section] } });
        }
        // フリーワードの検索対象はタイトル(日英両方)
        // 空白つなぎでOR検索
        if (words !== null) {
            // trim and to half-width space
            words = words.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            const orConditions = words.split(' ').filter((value) => (value.length > 0)).reduce((a, word) => {
                return a.concat({ 'name.ja': { $regex: `${word}` } }, { 'name.en': { $regex: `${word}` } });
            }, []);
            debug(orConditions);
            filmAndConditions.push({ $or: orConditions });
        }
        // 条件があれば作品検索してID条件として追加
        if (filmAndConditions.length > 0) {
            const filmIds = yield ttts.Models.Film.distinct('_id', { $and: filmAndConditions }).exec();
            debug('filmIds:', filmIds);
            // 該当作品がない場合、filmIdsが空配列となりok
            andConditions.push({ film: { $in: filmIds } });
        }
    });
}
