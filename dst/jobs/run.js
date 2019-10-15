"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const run_1 = require("./continuous/abortTasks/run");
// import makeTransactionExpired from './continuous/makeTransactionExpired/run';
// import reexportTransactionTasks from './continuous/reexportTransactionTasks/run';
const run_2 = require("./continuous/retryTasks/run");
// import watchConfirmedTransaction from './continuous/watchConfirmedTransaction/run';
// import watchExpiredTransaction from './continuous/watchExpiredTransaction/run';
// import watchReturnOrderTransaction from './continuous/watchReturnOrderTransaction/run';
const run_3 = require("./continuous/aggregateEventReservations/run");
// import cancelCreditCard from './continuous/cancelCreditCard/run';
// import cancelReservation from './continuous/cancelReservation/run';
// import cancelSeatReservation from './continuous/cancelSeatReservation/run';
// import confirmReservation from './continuous/confirmReservation/run';
const run_4 = require("./continuous/createPlaceOrderReport/run");
const run_5 = require("./continuous/createReturnOrderReport/run");
// import payCreditCard from './continuous/payCreditCard/run';
// import placeOrder from './continuous/placeOrder/run';
// import refundCreditCard from './continuous/refundCreditCard/run';
// import returnOrder from './continuous/returnOrder/run';
const run_6 = require("./continuous/returnOrdersByPerformance/run");
// import sendEmailMessage from './continuous/sendEmailMessage/run';
// import sendOrder from './continuous/sendOrder/run';
// import triggerWebhook from './continuous/triggerWebhook/run';
const run_7 = require("./continuous/updateOrderReportByReservation/run");
const run_8 = require("./triggered/createEvents/run");
const run_9 = require("./triggered/importEvents/run");
const run_10 = require("./triggered/makeAggregationsExpired/run");
const run_11 = require("./triggered/syncCheckinGates/run");
const MULTI_TENANT_SUPPORTED = process.env.MULTI_TENANT_SUPPORTED === '1';
const project = { typeOf: 'Project', id: process.env.PROJECT_ID };
// tslint:disable-next-line:cyclomatic-complexity
exports.default = () => __awaiter(this, void 0, void 0, function* () {
    yield run_1.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_2.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await makeTransactionExpired({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await reexportTransactionTasks({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await watchConfirmedTransaction({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await watchExpiredTransaction({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await watchReturnOrderTransaction({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_3.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await cancelCreditCard({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await cancelReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await cancelSeatReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await confirmReservation({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_4.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_5.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await payCreditCard({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await placeOrder({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await refundCreditCard({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await returnOrder({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_6.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await sendEmailMessage({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await sendOrder({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    // await triggerWebhook({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_7.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_8.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_9.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_10.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_11.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
});
