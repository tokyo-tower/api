/**
 * パフォーマンスルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';
import * as moment from 'moment-timezone';

const setting = {
    offerCodes: [
        '001',
        '002',
        '003',
        '004',
        '005',
        '006'
    ]
};

export interface IPerformance4pos {
    id: string;
    attributes: {
        day: string;
        open_time: string;
        start_time: string;
        end_time: string;
        seat_status?: string;
        tour_number?: string;
        wheelchair_available?: number;
        ticket_types: {
            charge?: number;
            name: {
                en?: string;
                ja?: string;
            };
            id?: string;
            available_num?: number;
        }[];
        online_sales_status: string;
    };
}

export interface ISearchConditions4pos {
    page?: number;
    limit?: number;
    day?: string;
    performanceId?: string;
}

export type ISearchResult = ttts.factory.performance.IPerformanceWithAvailability[];

export type ISearchOperation<T> = (repos: {
    performance: ttts.repository.Performance;
}) => Promise<T>;

const cinerinoAuthClient = new cinerinoapi.auth.ClientCredentials({
    domain: <string>process.env.CINERINO_AUTHORIZE_SERVER_DOMAIN,
    clientId: <string>process.env.CINERINO_CLIENT_ID,
    clientSecret: <string>process.env.CINERINO_CLIENT_SECRET,
    scopes: [],
    state: ''
});

const eventService = new cinerinoapi.service.Event({
    endpoint: <string>process.env.CINERINO_API_ENDPOINT,
    auth: cinerinoAuthClient
});

export function searchByChevre(params: ISearchConditions4pos) {
    return async (): Promise<IPerformance4pos[]> => {
        let events: cinerinoapi.factory.chevre.event.screeningEvent.IEvent[];

        // performanceId指定の場合はこちら
        if (typeof params.performanceId === 'string') {
            const event = await eventService.findById<cinerinoapi.factory.chevre.eventType.ScreeningEvent>({ id: params.performanceId });
            events = [event];
        } else {
            const searchConditions: cinerinoapi.factory.chevre.event.screeningEvent.ISearchConditions = {
                // tslint:disable-next-line:no-magic-numbers
                limit: (params.limit !== undefined) ? Number(params.limit) : 100,
                page: (params.page !== undefined) ? Math.max(Number(params.page), 1) : 1,
                sort: { startDate: 1 },
                typeOf: cinerinoapi.factory.chevre.eventType.ScreeningEvent,
                ...(typeof params.day === 'string' && params.day.length > 0)
                    ? {
                        startFrom: moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .toDate(),
                        startThrough: moment(`${params.day}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .add(1, 'day')
                            .toDate()
                    }
                    : undefined,
                ...{
                    $projection: { aggregateReservation: 0 }
                }
            };

            const searchResult = await eventService.search(searchConditions);

            events = searchResult.data;
        }

        // 検索結果があれば、ひとつめのイベントのオファーを検索
        if (events.length === 0) {
            return [];
        }

        const firstEvent = events[0];

        const offers = await eventService.searchTicketOffers({
            event: { id: firstEvent.id },
            seller: {
                typeOf: <cinerinoapi.factory.organizationType>firstEvent.offers?.seller?.typeOf,
                id: <string>firstEvent.offers?.seller?.id
            },
            store: {
                id: <string>process.env.CINERINO_CLIENT_ID
            }
        });

        const unitPriceOffers: cinerinoapi.factory.chevre.offer.IUnitPriceOffer[] = offers
            // 指定のオファーコードに限定する
            .filter((o) => setting.offerCodes.includes(o.identifier))
            .map((o) => {
                // tslint:disable-next-line:max-line-length
                const unitPriceSpec = <cinerinoapi.factory.chevre.priceSpecification.IPriceSpecification<cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification>>
                    o.priceSpecification.priceComponent.find(
                        (p) => p.typeOf === cinerinoapi.factory.chevre.priceSpecificationType.UnitPriceSpecification
                    );

                return {
                    ...o,
                    priceSpecification: unitPriceSpec
                };
            });

        return events
            .map((event) => {
                return event2performance4pos({ event, unitPriceOffers });
            });
    };
}

function event2performance4pos(params: {
    event: cinerinoapi.factory.chevre.event.screeningEvent.IEvent;
    unitPriceOffers: cinerinoapi.factory.chevre.offer.IUnitPriceOffer[];
}): IPerformance4pos {
    const event = params.event;
    const unitPriceOffers = params.unitPriceOffers;

    // 一般座席の残席数
    const seatStatus = event.aggregateOffer?.offers?.find((o) => o.identifier === '001')?.remainingAttendeeCapacity;
    // 車椅子座席の残席数
    const wheelchairAvailable = event.aggregateOffer?.offers?.find((o) => o.identifier === '004')?.remainingAttendeeCapacity;

    const tourNumber = event.additionalProperty?.find((p) => p.name === 'tourNumber')?.value;

    return {
        id: event.id,
        attributes: {
            day: moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('YYYYMMDD'),
            open_time: moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('HHmm'),
            start_time: moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('HHmm'),
            end_time: moment(event.endDate)
                .tz('Asia/Tokyo')
                .format('HHmm'),
            seat_status: (typeof seatStatus === 'number') ? String(seatStatus) : undefined,
            wheelchair_available: wheelchairAvailable,
            tour_number: tourNumber,
            ticket_types: unitPriceOffers.map((unitPriceOffer) => {
                const availableNum =
                    event.aggregateOffer?.offers?.find((o) => o.id === unitPriceOffer.id)?.remainingAttendeeCapacity;

                return {
                    name: <cinerinoapi.factory.chevre.multilingualString>unitPriceOffer.name,
                    id: String(unitPriceOffer.identifier), // POSに受け渡すのは券種IDでなく券種コードなので要注意
                    // POSに対するAPI互換性維持のため、charge属性追加
                    charge: unitPriceOffer.priceSpecification?.price,
                    available_num: availableNum
                };
            }),
            online_sales_status: (event.eventStatus === cinerinoapi.factory.chevre.eventStatusType.EventScheduled)
                ? ttts.factory.performance.OnlineSalesStatus.Normal
                : ttts.factory.performance.OnlineSalesStatus.Suspended
        }
    };
}

/**
 * 検索する
 */
export function search(
    searchConditions: ttts.factory.performance.ISearchConditions,
    useExtension: boolean
): ISearchOperation<ISearchResult> {
    return async (repos: {
        performance: ttts.repository.Performance;
    }) => {
        const projection: any = (useExtension)
            ? undefined
            : {
                __v: 0,
                created_at: 0,
                updated_at: 0,
                ttts_extension: 0
            };

        const performances = await repos.performance.search(searchConditions, projection);

        return performances.map(performance2result);
    };
}

function performance2result(
    performance: ttts.factory.performance.IPerformance & ttts.factory.performance.IPerformanceWithAggregation
): ttts.factory.performance.IPerformanceWithAvailability {
    const tourNumber = performance.additionalProperty?.find((p) => p.name === 'tourNumber')?.value;

    return {
        ...performance,
        ...(performance.ttts_extension !== undefined)
            ? { extension: performance.ttts_extension }
            : undefined,
        ...{
            tourNumber: tourNumber
        }
    };
}
