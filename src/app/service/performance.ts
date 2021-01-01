/**
 * パフォーマンスルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';

const USE_NEW_AGGREGATE_ENTRANCE_GATE = process.env.USE_NEW_AGGREGATE_ENTRANCE_GATE === '1';

export type ISearchResult = ttts.factory.performance.IPerformance[];

export type ISearchOperation<T> = (repos: {
    performance: ttts.repository.Performance;
}) => Promise<T>;

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
            ? {
                __v: 0,
                created_at: 0,
                updated_at: 0,
                location: 0,
                superEvent: 0,
                offers: 0,
                doorTime: 0,
                duration: 0,
                maximumAttendeeCapacity: 0,
                remainingAttendeeCapacity: 0,
                remainingAttendeeCapacityForWheelchair: 0,
                reservationCount: 0,
                reservationCountsByTicketType: 0
            }
            : {
                __v: 0,
                created_at: 0,
                updated_at: 0,
                location: 0,
                superEvent: 0,
                offers: 0,
                doorTime: 0,
                duration: 0,
                maximumAttendeeCapacity: 0,
                remainingAttendeeCapacity: 0,
                remainingAttendeeCapacityForWheelchair: 0,
                reservationCount: 0,
                reservationCountsByTicketType: 0,
                ttts_extension: 0
            };

        const performances = await repos.performance.search(searchConditions, projection);

        return performances.map(performance2result);
    };
}

/**
 * エレベータ運行ステータス
 */
enum EvServiceStatus {
    // 正常運行
    Normal = 'Normal',
    // 減速
    Slowdown = 'Slowdown',
    // 停止
    Suspended = 'Suspended'
}

/**
 * オンライン販売ステータス
 */
enum OnlineSalesStatus {
    // 販売
    Normal = 'Normal',
    // 停止
    Suspended = 'Suspended'
}

// tslint:disable-next-line:max-func-body-length
export function performance2result(performance: ttts.factory.performance.IPerformance): ttts.factory.performance.IPerformance {
    const tourNumber = performance.additionalProperty?.find((p) => p.name === 'tourNumber')?.value;

    let evServiceStatus = EvServiceStatus.Normal;
    let onlineSalesStatus = OnlineSalesStatus.Normal;

    switch (performance.eventStatus) {
        case cinerinoapi.factory.chevre.eventStatusType.EventCancelled:
            evServiceStatus = EvServiceStatus.Suspended;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventPostponed:
            evServiceStatus = EvServiceStatus.Slowdown;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventScheduled:
            break;

        default:
    }

    let maximumAttendeeCapacity: number | undefined;
    let remainingAttendeeCapacity: number | undefined;
    let remainingAttendeeCapacityForWheelchair: number | undefined;
    let reservationCount: number | undefined;
    let reservationCountsByTicketType: ttts.factory.performance.IReservationCountByTicketType[] | undefined;
    let checkinCountsByWhere: ttts.factory.performance.ICheckinCountByWhere[] | undefined;
    let checkinCount: number | undefined;

    // aggregateOffer,aggregateReservationから算出する
    maximumAttendeeCapacity = performance.aggregateOffer?.offers?.find((o) => o.identifier === '001')?.maximumAttendeeCapacity;
    remainingAttendeeCapacity = performance.aggregateOffer?.offers?.find((o) => o.identifier === '001')?.remainingAttendeeCapacity;
    remainingAttendeeCapacityForWheelchair
        = performance.aggregateOffer?.offers?.find((o) => o.identifier === '004')?.remainingAttendeeCapacity;

    reservationCount = performance.aggregateReservation?.reservationCount;
    reservationCountsByTicketType = performance.aggregateOffer?.offers?.map((offer) => {
        return {
            ticketType: <string>offer.id,
            count: offer.aggregateReservation?.reservationCount
        };
    });

    checkinCountsByWhere = (<any>performance).aggregateEntranceGate?.places?.map((entranceGate: any) => {
        return {
            where: entranceGate.identifier,
            checkinCountsByTicketType: entranceGate.aggregateOffer?.offers?.map((offer: any) => {
                return {
                    ticketType: offer.id,
                    ticketCategory: offer.category?.codeValue,
                    count: offer.aggregateReservation?.useActionCount
                };
            })
        };
    });
    if (Array.isArray((<any>performance).aggregateEntranceGate?.places)) {
        checkinCount = (<any[]>(<any>performance).aggregateEntranceGate.places).reduce<number>(
            (a, b) => {
                let useActionCount = a;

                if (Array.isArray(b.aggregateOffer?.offers)) {
                    useActionCount += (<any[]>b.aggregateOffer.offers).reduce<number>(
                        (a2, b2) => {
                            return a2 + Number(b2.aggregateReservation?.useActionCount);
                        },
                        0
                    );

                }

                return useActionCount;
            },
            0
        );

    }

    return {
        ...performance,
        ...{
            evServiceStatus: evServiceStatus,
            onlineSalesStatus: onlineSalesStatus,
            tourNumber: tourNumber
        },

        ...(typeof maximumAttendeeCapacity === 'number') ? { maximumAttendeeCapacity } : undefined,
        ...(typeof remainingAttendeeCapacity === 'number') ? { remainingAttendeeCapacity } : undefined,
        ...(typeof remainingAttendeeCapacityForWheelchair === 'number') ? { remainingAttendeeCapacityForWheelchair } : undefined,
        ...(typeof reservationCount === 'number') ? { reservationCount } : undefined,
        ...(Array.isArray(reservationCountsByTicketType)) ? { reservationCountsByTicketType } : undefined,
        ...(Array.isArray(checkinCountsByWhere)) ? { checkinCountsByWherePreview: checkinCountsByWhere } : undefined,
        ...(typeof checkinCount === 'number') ? { checkinCountPreview: checkinCount } : undefined,
        ...(USE_NEW_AGGREGATE_ENTRANCE_GATE)
            ? (Array.isArray(checkinCountsByWhere))
                ? { checkinCountsByWhere, checkinCount }
                : {
                    // 万が一の互換性維持対応
                    checkinCountsByWhere: [
                        { where: 'DAITEN_AUTH', checkinCountsByTicketType: [] },
                        { where: 'TOPDECK_AUTH', checkinCountsByTicketType: [] }
                    ],
                    checkinCount: 0
                }
            : undefined
    };
}
