/**
 * Chevreにイベントを作成する
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import * as ttts from '@tokyotower/domain';
import { CronJob } from 'cron';
import * as createDebug from 'debug';
import * as fs from 'fs-extra';
import * as moment from 'moment-timezone';
import * as mongoose from 'mongoose';

import { connectMongo } from '../../../connectMongo';
import * as singletonProcess from '../../../singletonProcess';

import { ISetting } from '../../setting';

const debug = createDebug('ttts-api:jobs');

const project = { typeOf: <'Project'>'Project', id: <string>process.env.PROJECT_ID };

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: <string>process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.CHEVRE_CLIENT_ID,
    clientSecret: <string>process.env.CHEVRE_CLIENT_SECRET,
    scopes: [],
    state: ''
});

export default async (params: {
    project?: ttts.factory.project.IProject;
}) => {
    let holdSingletonProcess = false;
    setInterval(
        async () => {
            holdSingletonProcess = await singletonProcess.lock({
                project: params.project,
                key: 'createEvents',
                ttl: 60
            });
        },
        // tslint:disable-next-line:no-magic-numbers
        10000
    );

    const connection = await connectMongo({ defaultConnection: false });

    const job = new CronJob(
        '0 * * * *',
        async () => {
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
        },
        undefined,
        true
    );
    debug('job started', job);
};

/**
 * 設定からイベントを作成する
 */
// tslint:disable-next-line:max-func-body-length
export async function main(connection: mongoose.Connection): Promise<void> {
    // 販売者をひとつ取得
    const sellerService = new cinerinoapi.service.Seller({
        auth: cinerinoAuthClient,
        endpoint: <string>process.env.CINERINO_API_ENDPOINT,
        project: { id: project.id }
    });
    const searchSellersResult = await sellerService.search({
        limit: 1
    });
    const seller = searchSellersResult.data.shift();
    if (seller === undefined) {
        throw new Error('Seller not found');
    }

    // 作成情報取得
    const setting: ISetting = fs.readJsonSync(`${__dirname}/../../../../data/setting.json`);
    debug('setting:', setting);

    // 引数情報取得
    const targetInfo = getTargetInfoForCreateFromSetting(setting.performance_duration, setting.no_performance_times);
    debug('targetInfo:', targetInfo);

    const projectRepo = new ttts.repository.Project(connection);
    const projectDetails = await projectRepo.findById({ id: project.id });
    if (projectDetails.settings === undefined) {
        throw new ttts.factory.errors.ServiceUnavailable('Project settings undefined');
    }
    if (projectDetails.settings.chevre === undefined) {
        throw new ttts.factory.errors.ServiceUnavailable('Project settings not found');
    }

    const authClient = new ttts.chevre.auth.ClientCredentials({
        domain: <string>process.env.CHEVRE_AUTHORIZE_SERVER_DOMAIN,
        clientId: <string>process.env.CHEVRE_CLIENT_ID,
        clientSecret: <string>process.env.CHEVRE_CLIENT_SECRET,
        scopes: [],
        state: ''
    });

    const offerCatalogService = new ttts.chevre.service.OfferCatalog({
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
    const searchMovieTheatersResult = await placeService.searchMovieTheaters({
        project: { ids: [project.id] }
    });
    const movieTheaterWithoutScreeningRoom = searchMovieTheatersResult.data.find((d) => d.branchCode === setting.theater);
    if (movieTheaterWithoutScreeningRoom === undefined) {
        throw new Error('Movie Theater Not Found');
    }
    const movieTheater = await placeService.findMovieTheaterById({ id: movieTheaterWithoutScreeningRoom.id });
    debug('movieTheater:', movieTheater);

    const screeningRoom = movieTheater.containsPlace[0];

    // 劇場作品検索
    const workPerformedIdentifier = setting.film;
    const searchScreeningEventSeriesResult = await eventService.search<ttts.chevre.factory.eventType.ScreeningEventSeries>({
        project: { ids: [project.id] },
        typeOf: ttts.chevre.factory.eventType.ScreeningEventSeries,
        workPerformed: { identifiers: [workPerformedIdentifier] }
    });
    const screeningEventSeries = searchScreeningEventSeriesResult.data[0];
    debug('screeningEventSeries:', screeningEventSeries);

    // オファーカタログ検索
    const offerCatalogCode = setting.ticket_type_group;
    const searchOfferCatalogsResult = await offerCatalogService.search({
        limit: 1,
        project: { id: { $eq: project.id } },
        identifier: { $eq: offerCatalogCode }
    });
    const offerCatalog = searchOfferCatalogsResult.data[0];
    debug('offerCatalog:', offerCatalog);

    for (const performanceInfo of targetInfo) {
        const id = [
            // tslint:disable-next-line:no-magic-numbers
            performanceInfo.day.slice(-6),
            workPerformedIdentifier,
            movieTheater.branchCode,
            screeningRoom.branchCode,
            performanceInfo.start_time
        ].join('');

        const offers = {
            project: offerCatalog.project,
            // id: <string>offerCatalog.id,
            // name: offerCatalog.name,
            typeOf: ttts.chevre.factory.offerType.Offer,
            priceCurrency: ttts.chevre.factory.priceCurrency.JPY,
            availabilityEnds: moment(performanceInfo.end_date)
                .tz('Asia/Tokyo')
                .endOf('date')
                .toDate(),
            availabilityStarts: moment(performanceInfo.start_date)
                .tz('Asia/Tokyo')
                .startOf('date')
                // tslint:disable-next-line:no-magic-numbers
                .add(-3, 'months')
                .toDate(),
            eligibleQuantity: {
                typeOf: <'QuantitativeValue'>'QuantitativeValue',
                unitCode: <ttts.chevre.factory.unitCode.C62>ttts.chevre.factory.unitCode.C62,
                maxValue: 10,
                value: 1
            },
            itemOffered: {
                serviceType: <any>{},
                serviceOutput: {
                    typeOf: ttts.chevre.factory.reservationType.EventReservation,
                    reservedTicket: {
                        typeOf: <'Ticket'>'Ticket',
                        ticketedSeat: { typeOf: <ttts.chevre.factory.placeType.Seat>ttts.chevre.factory.placeType.Seat }
                    }
                }
            },
            seller: {
                typeOf: seller.typeOf,
                id: seller.id,
                name: seller.name
            },
            validThrough: moment(performanceInfo.end_date)
                .tz('Asia/Tokyo')
                .endOf('date')
                .toDate(),
            validFrom: moment(performanceInfo.start_date)
                .tz('Asia/Tokyo')
                .startOf('date')
                // tslint:disable-next-line:no-magic-numbers
                .add(-3, 'months')
                .toDate(),
            acceptedPaymentMethod: [
                ttts.chevre.factory.paymentMethodType.Cash,
                ttts.chevre.factory.paymentMethodType.CreditCard,
                ttts.chevre.factory.paymentMethodType.Others
            ]
        };

        // パフォーマンス登録
        const event: ttts.chevre.factory.event.screeningEvent.IAttributes = {
            project: project,
            typeOf: ttts.chevre.factory.eventType.ScreeningEvent,
            eventStatus: ttts.chevre.factory.eventStatusType.EventScheduled,
            name: screeningEventSeries.name,
            doorTime: performanceInfo.door_time,
            startDate: performanceInfo.start_date,
            endDate: performanceInfo.end_date,
            workPerformed: screeningEventSeries.workPerformed,
            superEvent: screeningEventSeries,
            location: {
                project: project,
                typeOf: <ttts.chevre.factory.placeType.ScreeningRoom>screeningRoom.typeOf,
                branchCode: screeningRoom.branchCode,
                name: screeningRoom.name,
                alternateName: <any>screeningRoom.alternateName,
                address: screeningRoom.address
            },
            offers: offers,
            checkInCount: undefined,
            attendeeCount: undefined,
            additionalProperty: [{ name: 'tourNumber', value: String(performanceInfo.tour_number) }],
            ...{
                hasOfferCatalog: {
                    typeOf: 'OfferCatalog',
                    id: offerCatalog.id
                }
            }
        };

        debug('upserting event...', id);
        await eventService.update({
            id: id,
            attributes: event,
            upsert: true
        });
        debug('upserted', id);
    }
}

export interface ITargetPerformanceInfo {
    day: string;
    start_time: string;
    end_time: string;
    door_time: Date;
    start_date: Date;
    end_date: Date;
    duration: string;
    tour_number: string;
}

/**
 * パフォーマンス作成・作成対象情報取得
 */
function getTargetInfoForCreateFromSetting(duration: number, noPerformanceTimes: string[]): ITargetPerformanceInfo[] {
    const performanceInfos: ITargetPerformanceInfo[] = [];

    // 作成対象時間: 9,10,11など
    const hours: string[] = ['9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];
    // 作成開始が今日から何日後か: 30
    const start: number = 91;
    // 何日分作成するか: 7
    const days: number = 1;

    const minutes = ['00', '15', '30', '45'];
    const tours = ['1', '2', '3', '4'];

    // 本日日付+開始日までの日数から作成開始日セット
    // 作成日数分の作成対象日付作成
    for (let index = 0; index < days; index = index + 1) {
        const now = moment()
            .add(start + index, 'days');

        hours.forEach((hourStr) => {
            // 2桁でない時は'0'詰め
            // tslint:disable-next-line:no-magic-numbers
            const hour = `0${hourStr}`.slice(-2);

            minutes.forEach((minute, minuteIndex) => {
                // ツアー情報作成
                const tourNumber = `${hour}${tours[minuteIndex]}`;
                const startDate = moment(`${now.format('YYYYMMDD')} ${hour}:${minute}:00+09:00`, 'YYYYMMDD HH:mm:ssZ');
                const endDate = moment(startDate)
                    .add(duration, 'minutes');
                const day = moment(startDate)
                    .tz('Asia/Tokyo')
                    .format('YYYYMMDD');
                const startTime = moment(startDate)
                    .tz('Asia/Tokyo')
                    .format('HHmm');
                const endTime = moment(endDate)
                    .tz('Asia/Tokyo')
                    .format('HHmm');

                // パフォーマンスを作成しない時刻に指定されていなかったら作成
                if (noPerformanceTimes.indexOf(`${hour}${minute}`) < 0) {
                    performanceInfos.push({
                        day: day,
                        start_time: startTime,
                        end_time: endTime,
                        door_time: startDate.toDate(),
                        start_date: startDate.toDate(),
                        end_date: endDate.toDate(),
                        tour_number: tourNumber,
                        duration: moment.duration(duration, 'minutes')
                            .toISOString()
                    });
                }
            });
        });
    }

    return performanceInfos;
}
