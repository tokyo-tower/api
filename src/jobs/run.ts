/**
 * 非同期ジョブ
 */
import { factory } from '@tokyotower/domain';

import abortTasks from './continuous/abortTasks/run';
// import makeTransactionExpired from './continuous/makeTransactionExpired/run';
// import reexportTransactionTasks from './continuous/reexportTransactionTasks/run';
import retryTasks from './continuous/retryTasks/run';

// import watchConfirmedTransaction from './continuous/watchConfirmedTransaction/run';
// import watchExpiredTransaction from './continuous/watchExpiredTransaction/run';
// import watchReturnOrderTransaction from './continuous/watchReturnOrderTransaction/run';

import aggregateEventReservations from './continuous/aggregateEventReservations/run';
// import cancelCreditCard from './continuous/cancelCreditCard/run';
// import cancelReservation from './continuous/cancelReservation/run';
// import cancelSeatReservation from './continuous/cancelSeatReservation/run';
// import confirmReservation from './continuous/confirmReservation/run';
import createPlaceOrderReport from './continuous/createPlaceOrderReport/run';
import createReturnOrderReport from './continuous/createReturnOrderReport/run';
// import payCreditCard from './continuous/payCreditCard/run';
// import placeOrder from './continuous/placeOrder/run';
// import refundCreditCard from './continuous/refundCreditCard/run';
// import returnOrder from './continuous/returnOrder/run';
import returnOrdersByPerformance from './continuous/returnOrdersByPerformance/run';
// import sendEmailMessage from './continuous/sendEmailMessage/run';
// import sendOrder from './continuous/sendOrder/run';
// import triggerWebhook from './continuous/triggerWebhook/run';
import updateOrderReportByReservation from './continuous/updateOrderReportByReservation/run';

import createEvents from './triggered/createEvents/run';
import importEvents from './triggered/importEvents/run';
import makeAggregationsExpired from './triggered/makeAggregationsExpired/run';
import syncCheckinGates from './triggered/syncCheckinGates/run';

const MULTI_TENANT_SUPPORTED = process.env.MULTI_TENANT_SUPPORTED === '1';
const project: factory.project.IProject = { typeOf: 'Project', id: <string>process.env.PROJECT_ID };

// tslint:disable-next-line:cyclomatic-complexity
export default async () => {
    await abortTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await retryTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await makeTransactionExpired({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await reexportTransactionTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    // await watchConfirmedTransaction({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await watchExpiredTransaction({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await watchReturnOrderTransaction({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    await aggregateEventReservations({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await cancelCreditCard({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await cancelReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await cancelSeatReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await confirmReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await createPlaceOrderReport({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await createReturnOrderReport({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await payCreditCard({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await placeOrder({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await refundCreditCard({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await returnOrder({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await returnOrdersByPerformance({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await sendEmailMessage({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await sendOrder({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await triggerWebhook({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await updateOrderReportByReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });

    await createEvents({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await importEvents({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await makeAggregationsExpired({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    await syncCheckinGates({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
};
