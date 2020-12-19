/**
 * パフォーマンスルーター
 */
import * as cinerinoapi from '@cinerino/sdk';
import * as ttts from '@tokyotower/domain';

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
                duration: 0
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
                ttts_extension: 0
            };

        const performances = await repos.performance.search(searchConditions, projection);

        return performances.map(performance2result);
    };
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

function performance2result(performance: ttts.factory.performance.IPerformance): ttts.factory.performance.IPerformance {
    const tourNumber = performance.additionalProperty?.find((p) => p.name === 'tourNumber')?.value;

    let evServiceStatus = ttts.factory.performance.EvServiceStatus.Normal;
    let onlineSalesStatus = OnlineSalesStatus.Normal;

    switch (performance.eventStatus) {
        case cinerinoapi.factory.chevre.eventStatusType.EventCancelled:
            evServiceStatus = ttts.factory.performance.EvServiceStatus.Suspended;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventPostponed:
            evServiceStatus = ttts.factory.performance.EvServiceStatus.Slowdown;
            onlineSalesStatus = OnlineSalesStatus.Suspended;
            break;
        case cinerinoapi.factory.chevre.eventStatusType.EventScheduled:
            break;

        default:
    }

    return {
        ...performance,
        ...{
            evServiceStatus: evServiceStatus,
            onlineSalesStatus: onlineSalesStatus,
            tourNumber: tourNumber
        }
    };
}
