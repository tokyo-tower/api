/**
 * 非同期ジョブ
 */
import * as cinerinoapi from '@cinerino/sdk';
import { factory } from '@tokyotower/domain';

import abortTasks from './continuous/abortTasks/run';
import retryTasks from './continuous/retryTasks/run';

import aggregateEventReservations from './continuous/aggregateEventReservations/run';
import createPlaceOrderReport from './continuous/createPlaceOrderReport/run';
import createReturnOrderReport from './continuous/createReturnOrderReport/run';
import importEvent from './continuous/importEvent/run';
import sendEmailMessage from './continuous/sendEmailMessage/run';
import updateOrderReportByReservation from './continuous/updateOrderReportByReservation/run';

const MULTI_TENANT_SUPPORTED = process.env.MULTI_TENANT_SUPPORTED === '1';
const project: factory.project.IProject = { typeOf: cinerinoapi.factory.organizationType.Project, id: <string>process.env.PROJECT_ID };
const USE_SEND_EMAIL = process.env.USE_SEND_EMAIL === '1';

export default async () => {
    await abortTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await retryTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    await aggregateEventReservations({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await createPlaceOrderReport({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await createReturnOrderReport({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await importEvent({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    if (USE_SEND_EMAIL) {
        await sendEmailMessage({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    }
    await updateOrderReportByReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
};
