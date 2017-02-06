"use strict";
const BaseController_1 = require("../BaseController");
const ttts_domain_1 = require("@motionpicture/ttts-domain");
const moment = require("moment");
const conf = require("config");
class PerformanceController extends BaseController_1.default {
    search() {
        let limit = (this.req.query.limit) ? parseInt(this.req.query.limit) : null;
        let page = (this.req.query.page) ? parseInt(this.req.query.page) : 1;
        let day = (this.req.query.day) ? this.req.query.day : null;
        let section = (this.req.query.section) ? this.req.query.section : null;
        let words = (this.req.query.words) ? this.req.query.words : null;
        let startFrom = (this.req.query.start_from) ? parseInt(this.req.query.start_from) : null;
        let theater = (this.req.query.theater) ? this.req.query.theater : null;
        let screen = (this.req.query.screen) ? this.req.query.screen : null;
        let andConditions = [
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
            let now = moment(startFrom);
            let tomorrow = moment(startFrom).add(+24, 'hours');
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
        this.addFilmConditions(andConditions, section, words, (err, andConditions) => {
            if (err) {
                this.res.json({
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
            ttts_domain_1.Models.Performance.distinct('film', conditions, (err, filmIds) => {
                if (err) {
                    this.res.json({
                        success: false,
                        results: [],
                        performances_count: 0,
                        films_count: 0
                    });
                    return;
                }
                ttts_domain_1.Models.Performance.count(conditions, (err, performances_count) => {
                    if (err) {
                        this.res.json({
                            success: false,
                            results: [],
                            performances_count: 0,
                            films_count: 0
                        });
                        return;
                    }
                    let fields = '';
                    if (this.req.getLocale() === 'ja') {
                        fields = 'day open_time start_time film screen screen_name.ja theater theater_name.ja';
                    }
                    else {
                        fields = 'day open_time start_time film screen screen_name.en theater theater_name.en';
                    }
                    let query = ttts_domain_1.Models.Performance.find(conditions, fields);
                    if (limit) {
                        query.skip(limit * (page - 1)).limit(limit);
                    }
                    if (this.req.getLocale() === 'ja') {
                        query.populate('film', 'name.ja sections.name.ja minutes copyright');
                    }
                    else {
                        query.populate('film', 'name.en sections.name.en minutes copyright');
                    }
                    query.setOptions({
                        sort: {
                            day: 1,
                            start_time: 1
                        },
                    });
                    query.lean(true).exec((err, performances) => {
                        if (err) {
                            this.res.json({
                                success: false,
                                results: [],
                                performances_count: 0,
                                films_count: 0
                            });
                            return;
                        }
                        ttts_domain_1.PerformanceStatusesModel.find((err, performanceStatusesModel) => {
                            if (err) {
                            }
                            let results = performances.map((performance) => {
                                return {
                                    _id: performance['_id'],
                                    day: performance['day'],
                                    open_time: performance['open_time'],
                                    start_time: performance['start_time'],
                                    seat_status: (performanceStatusesModel) ? performanceStatusesModel.getStatus(performance['_id'].toString()) : null,
                                    theater_name: performance['theater_name'][this.req.getLocale()],
                                    screen_name: performance['screen_name'][this.req.getLocale()],
                                    film_id: performance['film']['_id'],
                                    film_name: performance['film']['name'][this.req.getLocale()],
                                    film_sections: performance['film']['sections'].map((section) => { return section['name'][this.req.getLocale()]; }),
                                    film_minutes: performance['film']['minutes'],
                                    film_copyright: performance['film']['copyright'],
                                    film_image: `https://${conf.get('dns_name')}/images/film/${performance['film']['_id']}.jpg`
                                };
                            });
                            this.res.json({
                                success: true,
                                results: results,
                                performances_count: performances_count,
                                films_count: filmIds.length
                            });
                        });
                    });
                });
            });
        });
    }
    addFilmConditions(andConditions, section, words, cb) {
        let filmAndConditions = [];
        if (section) {
            filmAndConditions.push({
                'sections.code': { $in: [section] }
            });
        }
        if (words) {
            words = words.replace(/(^\s+)|(\s+$)/g, '').replace(/\s/g, ' ');
            let regexes = words.split(' ').filter((value) => { return (value.length > 0); });
            let orConditions = [];
            for (let regex of regexes) {
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
            let filmConditions = {
                $and: filmAndConditions
            };
            ttts_domain_1.Models.Film.distinct('_id', filmConditions, (err, filmIds) => {
                if (err) {
                    andConditions.push({
                        'film': null
                    });
                    cb(err, andConditions);
                }
                else {
                    if (filmIds.length > 0) {
                        andConditions.push({
                            'film': {
                                $in: filmIds
                            }
                        });
                    }
                    else {
                        andConditions.push({
                            'film': null
                        });
                    }
                    cb(null, andConditions);
                }
            });
        }
        else {
            cb(null, andConditions);
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PerformanceController;
