/**
 * パフォーマンスコントローラー
 *
 * @namespace controllers/performance
 */

import { Models, PerformanceStatusesModel } from '@motionpicture/ttts-domain';
import * as createDebug from 'debug';
import { Request, Response } from 'express';
import * as moment from 'moment';
import * as _ from 'underscore';

const debug = createDebug('ttts-api:controller:performance');
const DEFAULT_RADIX = 10;

/**
 * 検索する
 *
 * @memberof controllers/performance
 */
// tslint:disable-next-line:max-func-body-length
export async function search(req: Request, res: Response) {
    // tslint:disable-next-line:max-line-length
    const limit: number | null = (!_.isEmpty(req.query.limit)) ? parseInt(req.query.limit, DEFAULT_RADIX) : null;
    const page: number = (!_.isEmpty(req.query.page)) ? parseInt(req.query.page, DEFAULT_RADIX) : 1;

    // 上映日
    const day: string | null = (!_.isEmpty(req.query.day)) ? req.query.day : null;
    // 部門
    const section: string | null = (!_.isEmpty(req.query.section)) ? req.query.section : null;
    // フリーワード
    const words: string | null = (!_.isEmpty(req.query.words)) ? req.query.words : null;
    // この時間以降開始のパフォーマンスに絞る(timestamp milliseconds)
    // tslint:disable-line:max-line-length
    const startFrom: number | null = (!_.isEmpty(req.query.start_from)) ? parseInt(req.query.start_from, DEFAULT_RADIX) : null;
    // 劇場
    const theater: string | null = (!_.isEmpty(req.query.theater)) ? req.query.theater : null;
    // スクリーン
    const screen: string | null = (!_.isEmpty(req.query.screen)) ? req.query.screen : null;

    // 検索条件を作成
    const andConditions: any[] = [
        { canceled: false }
    ];

    if (day !== null) {
        andConditions.push({ day: day });
    }

    if (theater !== null) {
        andConditions.push({ theater: theater });
    }

    if (screen !== null) {
        andConditions.push({ screen: screen });
    }

    if (startFrom !== null) {
        const now = moment(startFrom);
        // tslint:disable-next-line:no-magic-numbers
        const tomorrow = moment(startFrom).add(+24, 'hours');

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
    await addFilmConditions(andConditions, section, words);

    let conditions: any = null;
    if (andConditions.length > 0) {
        conditions = { $and: andConditions };
    }

    // 作品件数取得
    const filmIds = await Models.Performance.distinct('film', conditions).exec();

    // 総数検索
    const performancesCount = await Models.Performance.count(conditions).exec();

    // 必要な項目だけ指定すること(レスポンスタイムに大きく影響するので)
    const fields = 'day open_time start_time end_time film screen screen_name theater theater_name';
    const query = Models.Performance.find(conditions, fields);

    if (limit !== null) {
        query.skip(limit * (page - 1)).limit(limit);
    }

    query.populate('film', 'name sections.name minutes copyright');

    // 上映日、開始時刻
    query.setOptions({
        sort: {
            day: 1,
            start_time: 1
        }
    });

    const performances = <any[]>await query.lean(true).exec();

    // 空席情報を追加
    const performanceStatuses = await PerformanceStatusesModel.find().catch(() => undefined);
    const getStatus = (id: string) => {
        if (performanceStatuses !== undefined && performanceStatuses.hasOwnProperty(id)) {
            return (<any>performanceStatuses)[id];
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
                //seat_status: (performanceStatuses !== undefined) ? performanceStatuses.getStatus(performance._id.toString()) : null,
                seat_status: getStatus(performance._id.toString()),
                theater_name: performance.theater_name,
                screen_name: performance.screen_name,
                film: performance.film._id,
                film_name: performance.film.name,
                film_sections: performance.film.sections.map((filmSection: any) => filmSection.name),
                film_minutes: performance.film.minutes,
                film_copyright: performance.film.copyright,
                film_image: `${process.env.FRONTEND_ENDPOINT}/images/film/${performance.film._id}.jpg`
            }
        };
    });

    res.json({
        meta: {
            number_of_performances: performancesCount,
            number_of_films: filmIds.length
        },
        data: data
    });
}

/**
 * 作品に関する検索条件を追加する
 *
 * @param andConditions パフォーマンス検索条件
 * @param section 作品部門
 * @param words フリーワード
 */
async function addFilmConditions(andConditions: any[], section: string | null, words: string | null): Promise<void> {
    const filmAndConditions: any[] = [];
    if (section !== null) {
        // 部門条件の追加
        filmAndConditions.push({ 'sections.code': { $in: [section] } });
    }

    // フリーワードの検索対象はタイトル(日英両方)
    // 空白つなぎでOR検索
    if (words !== null) {
        // trim and to half-width space
        words = words.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
        const orConditions = words.split(' ').filter((value) => (value.length > 0)).reduce(
            (a: any[], word) => {
                return a.concat(
                    { 'name.ja': { $regex: `${word}` } },
                    { 'name.en': { $regex: `${word}` } }
                );
            },
            []
        );
        debug(orConditions);
        filmAndConditions.push({ $or: orConditions });
    }

    // 条件があれば作品検索してID条件として追加
    if (filmAndConditions.length > 0) {
        const filmIds = await Models.Film.distinct('_id', { $and: filmAndConditions }).exec();
        debug('filmIds:', filmIds);
        // 該当作品がない場合、filmIdsが空配列となりok
        andConditions.push({ film: { $in: filmIds } });
    }
}
