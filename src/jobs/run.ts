/**
 * 非同期ジョブ
 */
import * as cinerinoapi from '@cinerino/api-nodejs-client';
import { factory } from '@tokyotower/domain';

import abortTasks from './continuous/abortTasks/run';
import retryTasks from './continuous/retryTasks/run';

import aggregateEventReservations from './continuous/aggregateEventReservations/run';
import createPlaceOrderReport from './continuous/createPlaceOrderReport/run';
import createReturnOrderReport from './continuous/createReturnOrderReport/run';
import importEvent from './continuous/importEvent/run';
import returnOrdersByPerformance from './continuous/returnOrdersByPerformance/run';
import updateOrderReportByReservation from './continuous/updateOrderReportByReservation/run';

// import createEvents from './triggered/createEvents/run';
import importEvents from './triggered/importEvents/run';
import makeAggregationsExpired from './triggered/makeAggregationsExpired/run';
import syncCheckinGates from './triggered/syncCheckinGates/run';

const MULTI_TENANT_SUPPORTED = process.env.MULTI_TENANT_SUPPORTED === '1';
const project: factory.project.IProject = { typeOf: cinerinoapi.factory.organizationType.Project, id: <string>process.env.PROJECT_ID };

export default async () => {
    await abortTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await retryTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    await aggregateEventReservations({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await createPlaceOrderReport({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await createReturnOrderReport({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await importEvent({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await returnOrdersByPerformance({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await updateOrderReportByReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    // await createEvents({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await importEvents({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await makeAggregationsExpired({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await syncCheckinGates({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
};
