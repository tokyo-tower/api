/**
 * 非同期ジョブ
 */
import * as cinerinoapi from '@cinerino/sdk';
import { factory } from '@tokyotower/domain';

import abortTasks from './continuous/abortTasks/run';
import retryTasks from './continuous/retryTasks/run';

import updateOrderReportByReservation from './continuous/updateOrderReportByReservation/run';

const MULTI_TENANT_SUPPORTED = process.env.MULTI_TENANT_SUPPORTED === '1';
const project: factory.project.IProject = {
    typeOf: cinerinoapi.factory.chevre.organizationType.Project,
    id: <string>process.env.PROJECT_ID
};

export default async () => {
    await abortTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await retryTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    await updateOrderReportByReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
};
