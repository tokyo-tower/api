/**
 * Cinerinoからイベントをインポート
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

const debug = createDebug('ttts-api:jobs:importEvents');

const project: ttts.factory.project.IProject = { typeOf: cinerinoapi.factory.organizationType.Project, id: <string>process.env.PROJECT_ID };

const authClient = new ttts.chevre.auth.ClientCredentials({
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
                key: 'importEvents',
                ttl: 60
            });
        },
        // tslint:disable-next-line:no-magic-numbers
        10000
    );

    const connection = await connectMongo({ defaultConnection: false });

    const job = new CronJob(
        '15 * * * *',
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

// tslint:disable-next-line:max-func-body-length
export async function main(connection: mongoose.Connection): Promise<void> {
    // 作成情報取得
    const setting: ISetting = fs.readJsonSync(`${__dirname}/../../../../data/setting.json`);
    debug('setting:', setting);

    // 引数情報取得
    const { importFrom, importThrough } = getImportPeriod();
    debug(importFrom, importThrough);

    const eventService = new cinerinoapi.service.Event({
        endpoint: <string>process.env.CINERINO_API_ENDPOINT,
        auth: authClient
    });

    const offerCatalogCode = setting.ticket_type_group;
    const offerCodes = setting.offerCodes;

    // スケジュール検索
    const limit = 100;
    let page = 0;
    let numData: number = limit;
    const events: ttts.chevre.factory.event.IEvent<ttts.chevre.factory.eventType.ScreeningEvent>[] = [];
    while (numData === limit) {
        page += 1;
        const searchScreeningEventsResult = await eventService.search<ttts.chevre.factory.eventType.ScreeningEvent>({
            limit: limit,
            page: page,
            project: { ids: [project.id] },
            typeOf: ttts.chevre.factory.eventType.ScreeningEvent,
            inSessionFrom: importFrom,
            inSessionThrough: importThrough
        });
        numData = searchScreeningEventsResult.data.length;
        events.push(...searchScreeningEventsResult.data);
    }

    if (events.length > 0) {
        // ひとつめのイベントのオファー検索
        const offers = await eventService.searchTicketOffers({
            event: { id: events[0].id },
            seller: {
                typeOf: (<any>events[0]).offers.seller.typeOf,
                id: (<any>events[0]).offers.seller.id
            },
            store: {
                id: <string>process.env.ST_POS_ID
            }
        });

        const unitPriceOffers: ttts.chevre.factory.offer.IUnitPriceOffer[] = offers
            // 指定のオファーコードに限定する
            .filter((o) => offerCodes.includes(o.identifier))
            .map((o) => {
                // tslint:disable-next-line:max-line-length
                const unitPriceSpec = <ttts.chevre.factory.priceSpecification.IPriceSpecification<ttts.chevre.factory.priceSpecificationType.UnitPriceSpecification>>
                    o.priceSpecification.priceComponent.find(
                        (p) => p.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                    );

                return {
                    ...o,
                    priceSpecification: unitPriceSpec
                };
            });

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

                // パフォーマンス登録
                const performance: ttts.factory.performance.IPerformance = {
                    id: e.id,
                    doorTime: moment(e.doorTime)
                        .toDate(),
                    startDate: moment(e.startDate)
                        .toDate(),
                    endDate: moment(e.endDate)
                        .toDate(),
                    duration: <string>e.superEvent.duration,
                    superEvent: e.superEvent,
                    location: {
                        id: e.location.branchCode,
                        branchCode: e.location.branchCode,
                        name: <any>e.location.name
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
                        id: offerCatalogCode,
                        ticket_types: unitPriceOffers,
                        name: { ja: 'トップデッキツアー料金改定', en: 'Top Deck Tour' }
                    }
                };

                await performanceRepo.saveIfNotExists(performance);

                // 集計タスク作成
                const aggregateTask: ttts.factory.task.aggregateEventReservations.IAttributes = {
                    name: <any>ttts.factory.taskName.AggregateEventReservations,
                    project: project,
                    status: ttts.factory.taskStatus.Ready,
                    runsAt: new Date(),
                    remainingNumberOfTries: 3,
                    numberOfTried: 0,
                    executionResults: [],
                    data: { id: performance.id }
                };
                await taskRepo.save(<any>aggregateTask);
            } catch (error) {
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore next */
                // tslint:disable-next-line:no-console
                console.error(error);
            }
        }
    }
}

function getImportPeriod() {
    // 作成開始が今日から何日後か: 30
    const start: number = 91;
    // 何日分作成するか: 7
    const days: number = 1;

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
