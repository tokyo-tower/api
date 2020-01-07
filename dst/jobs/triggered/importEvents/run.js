"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Chevreからイベントをインポート
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const ttts = require("@tokyotower/domain");
const cron_1 = require("cron");
const createDebug = require("debug");
const fs = require("fs-extra");
const moment = require("moment-timezone");
const connectMongo_1 = require("../../../connectMongo");
const singletonProcess = require("../../../singletonProcess");
const debug = createDebug('ttts-api:jobs:importEvents');
const project = { typeOf: cinerinoapi.factory.organizationType.Project, id: process.env.PROJECT_ID };
exports.default = (params) => __awaiter(void 0, void 0, void 0, function* () {
    let holdSingletonProcess = false;
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        holdSingletonProcess = yield singletonProcess.lock({
            project: params.project,
            key: 'importEvents',
            ttl: 60
        });
    }), 
    // tslint:disable-next-line:no-magic-numbers
    10000);
    const connection = yield connectMongo_1.connectMongo({ defaultConnection: false });
    const job = new cron_1.CronJob('15 * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
        if (!holdSingletonProcess) {
            return;
        }
        // tslint:disable-next-line:no-floating-promises
        main(connection)
            .then(() => {
            // tslint:disable-next-line:no-console
            console.log('success!');
        })
            .catch((err) => {
            // tslint:disable-next-line:no-console
            console.error(err);
        });
    }), undefined, true);
    debug('job started', job);
});
// tslint:disable-next-line:max-func-body-length
function main(connection) {
    return __awaiter(this, void 0, void 0, function* () {
        // 作成情報取得
        const setting = fs.readJsonSync(`${__dirname}/../../../../data/setting.json`);
        debug('setting:', setting);
        // 引数情報取得
        const { importFrom, importThrough } = getImportPeriod();
        debug(importFrom, importThrough);
        const projectRepo = new ttts.repository.Project(connection);
        const projectDetails = yield projectRepo.findById({ id: project.id });
        if (projectDetails.settings === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('Project settings undefined');
        }
        if (projectDetails.settings.chevre === undefined) {
            throw new ttts.factory.errors.ServiceUnavailable('Project settings not found');
        }
        const authClient = new ttts.chevre.auth.ClientCredentials({
            domain: process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
            clientId: process.env.CHEVRE_CLIENT_ID,
            clientSecret: process.env.CHEVRE_CLIENT_SECRET,
            scopes: [],
            state: ''
        });
        const offerService = new ttts.chevre.service.Offer({
            endpoint: projectDetails.settings.chevre.endpoint,
            auth: authClient
        });
        const placeService = new ttts.chevre.service.Place({
            endpoint: projectDetails.settings.chevre.endpoint,
            auth: authClient
        });
        const eventService = new ttts.chevre.service.Event({
            endpoint: projectDetails.settings.chevre.endpoint,
            auth: authClient
        });
        // 劇場検索
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
            project: { ids: [project.id] }
        });
        const movieTheaterWithoutScreeningRoom = searchMovieTheatersResult.data.find((d) => d.branchCode === setting.theater);
        if (movieTheaterWithoutScreeningRoom === undefined) {
            throw new Error('Movie Theater Not Found');
        }
        const movieTheater = yield placeService.findMovieTheaterById({ id: movieTheaterWithoutScreeningRoom.id });
        debug('movieTheater:', movieTheater);
        const screeningRoom = movieTheater.containsPlace[0];
        // 劇場作品検索
        const workPerformedIdentifier = setting.film;
        const searchScreeningEventSeriesResult = yield eventService.search({
            project: { ids: [project.id] },
            typeOf: ttts.chevre.factory.eventType.ScreeningEventSeries,
            workPerformed: { identifiers: [workPerformedIdentifier] }
        });
        const screeningEventSeries = searchScreeningEventSeriesResult.data[0];
        debug('screeningEventSeries:', screeningEventSeries);
        // 券種検索
        const ticketTypeGroupIdentifier = setting.ticket_type_group;
        const searchTicketTypeGroupsResult = yield offerService.searchTicketTypeGroups({
            project: { ids: [project.id] },
            identifier: `^${ticketTypeGroupIdentifier}$`
        });
        const ticketTypeGroup = searchTicketTypeGroupsResult.data[0];
        debug('ticketTypeGroup:', ticketTypeGroup);
        const searchTicketTypesResult = yield offerService.searchTicketTypes({
            project: { ids: [project.id] },
            ids: ticketTypeGroup.ticketTypes
        });
        const ticketTypes = searchTicketTypesResult.data;
        debug('ticketTypes:', ticketTypes);
        // 上映スケジュール取得
        const limit = 100;
        let page = 0;
        let numData = limit;
        const events = [];
        while (numData === limit) {
            page += 1;
            const searchScreeningEventsResult = yield eventService.search({
                limit: limit,
                page: page,
                project: { ids: [project.id] },
                typeOf: ttts.chevre.factory.eventType.ScreeningEvent,
                inSessionFrom: importFrom,
                inSessionThrough: importThrough
            });
            numData = searchScreeningEventsResult.data.length;
            debug('numData:', numData);
            events.push(...searchScreeningEventsResult.data);
        }
        const performanceRepo = new ttts.repository.Performance(connection);
        const taskRepo = new ttts.repository.Task(connection);
        // イベントごとに永続化トライ
        for (const e of events) {
            try {
                let tourNumber = '';
                if (Array.isArray(e.additionalProperty)) {
                    const tourNumberProperty = e.additionalProperty.find((p) => p.name === 'tourNumber');
                    if (tourNumberProperty !== undefined) {
                        tourNumber = tourNumberProperty.value;
                    }
                }
                const offers = e.offers;
                if (offers !== undefined) {
                    // パフォーマンス登録
                    const performance = {
                        id: e.id,
                        doorTime: moment(e.doorTime)
                            .toDate(),
                        startDate: moment(e.startDate)
                            .toDate(),
                        endDate: moment(e.endDate)
                            .toDate(),
                        duration: e.superEvent.duration,
                        superEvent: e.superEvent,
                        location: {
                            id: screeningRoom.id,
                            branchCode: screeningRoom.branchCode,
                            name: screeningRoom.name
                        },
                        additionalProperty: e.additionalProperty,
                        ttts_extension: {
                            tour_number: tourNumber,
                            ev_service_status: ttts.factory.performance.EvServiceStatus.Normal,
                            ev_service_update_user: '',
                            online_sales_status: ttts.factory.performance.OnlineSalesStatus.Normal,
                            online_sales_update_user: '',
                            refund_status: ttts.factory.performance.RefundStatus.None,
                            refund_update_user: '',
                            refunded_count: 0
                        },
                        ticket_type_group: {
                            id: offers.id,
                            ticket_types: ticketTypes,
                            name: offers.name
                        }
                    };
                    debug('saving performance...', performance.id);
                    yield performanceRepo.saveIfNotExists(performance);
                    debug('saved', performance.id);
                    // 集計タスク作成
                    const aggregateTask = {
                        name: ttts.factory.taskName.AggregateEventReservations,
                        project: project,
                        status: ttts.factory.taskStatus.Ready,
                        runsAt: new Date(),
                        remainingNumberOfTries: 3,
                        numberOfTried: 0,
                        executionResults: [],
                        data: { id: performance.id }
                    };
                    yield taskRepo.save(aggregateTask);
                }
            }
            catch (error) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                // tslint:disable-next-line:no-console
                console.error(error);
            }
        }
    });
}
exports.main = main;
function getImportPeriod() {
    // 作成開始が今日から何日後か: 30
    const start = 91;
    // 何日分作成するか: 7
    const days = 1;
    const importFrom = moment()
        .add(start, 'days')
        .tz('Asia/Tokyo')
        .startOf('date')
        .toDate();
    const importThrough = moment(importFrom)
        .add(days - 1, 'days')
        .tz('Asia/Tokyo')
        .endOf('date')
        .toDate();
    return { importFrom, importThrough };
}
