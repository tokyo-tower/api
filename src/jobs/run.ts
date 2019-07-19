/**
 * 非同期ジョブ
 */
import { factory } from '@tokyotower/domain';

import abortTasks from './continuous/abortTasks/run';
import makeTransactionExpired from './continuous/makeTransactionExpired/run';
import reexportTransactionTasks from './continuous/reexportTransactionTasks/run';
import retryTasks from './continuous/retryTasks/run';

import watchConfirmedTransaction from './continuous/watchConfirmedTransaction/run';
import watchExpiredTransaction from './continuous/watchExpiredTransaction/run';
import watchReturnOrderTransaction from './continuous/watchReturnOrderTransaction/run';

import aggregateEventReservations from './continuous/aggregateEventReservations/run';
import cancelCreditCard from './continuous/cancelCreditCard/run';
import cancelSeatReservation from './continuous/cancelSeatReservation/run';
import createOrder from './continuous/createOrder/run';
import createPlaceOrderReport from './continuous/createPlaceOrderReport/run';
import createReturnOrderReport from './continuous/createReturnOrderReport/run';
import returnOrder from './continuous/returnOrder/run';
import returnOrdersByPerformance from './continuous/returnOrdersByPerformance/run';
import sendEmailNotification from './continuous/sendEmailNotification/run';
import settleCreditCard from './continuous/settleCreditCard/run';
import settleSeatReservation from './continuous/settleSeatReservation/run';
import triggerWebhook from './continuous/triggerWebhook/run';
import updateOrderReportByReservation from './continuous/updateOrderReportByReservation/run';

// import createImportScreeningEventsTask from './triggered/createImportScreeningEventsTask/run';
// import createUpdateEventAttendeeCapacityTask from './triggered/createUpdateEventAttendeeCapacityTask/run';

const MULTI_TENANT_SUPPORTED = process.env.MULTI_TENANT_SUPPORTED === '1';
const project: factory.project.IProject = { typeOf: 'Project', id: <string>process.env.PROJECT_ID };

// tslint:disable-next-line:cyclomatic-complexity
export default async () => {
    await abortTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await retryTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await makeTransactionExpired({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await reexportTransactionTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    await watchConfirmedTransaction({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await watchExpiredTransaction({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await watchReturnOrderTransaction({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    await aggregateEventReservations({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await cancelCreditCard({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await cancelSeatReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await createOrder({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await createPlaceOrderReport({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await createReturnOrderReport({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await returnOrder({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await returnOrdersByPerformance({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await sendEmailNotification({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await settleCreditCard({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await settleSeatReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await triggerWebhook({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await updateOrderReportByReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    // await createImportScreeningEventsTask({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await createUpdateEventAttendeeCapacityTask({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
};
