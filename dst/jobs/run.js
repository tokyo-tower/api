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
const run_2 = require("./continuous/makeTransactionExpired/run");
const run_3 = require("./continuous/reexportTransactionTasks/run");
const run_4 = require("./continuous/retryTasks/run");
const run_5 = require("./continuous/watchConfirmedTransaction/run");
const run_6 = require("./continuous/watchExpiredTransaction/run");
const run_7 = require("./continuous/watchReturnOrderTransaction/run");
const run_8 = require("./continuous/aggregateEventReservations/run");
const run_9 = require("./continuous/cancelCreditCard/run");
const run_10 = require("./continuous/cancelSeatReservation/run");
const run_11 = require("./continuous/createOrder/run");
const run_12 = require("./continuous/createPlaceOrderReport/run");
const run_13 = require("./continuous/createReturnOrderReport/run");
const run_14 = require("./continuous/returnOrder/run");
const run_15 = require("./continuous/returnOrdersByPerformance/run");
const run_16 = require("./continuous/sendEmailNotification/run");
const run_17 = require("./continuous/settleCreditCard/run");
const run_18 = require("./continuous/settleSeatReservation/run");
const run_19 = require("./continuous/triggerWebhook/run");
const run_20 = require("./continuous/updateOrderReportByReservation/run");
const run_21 = require("./triggered/createEvents/run");
const run_22 = require("./triggered/makeAggregationsExpired/run");
const run_23 = require("./triggered/syncCheckinGates/run");
const MULTI_TENANT_SUPPORTED = process.env.MULTI_TENANT_SUPPORTED === '1';
const project = { typeOf: 'Project', id: process.env.PROJECT_ID };
// tslint:disable-next-line:cyclomatic-complexity
exports.default = () => __awaiter(this, void 0, void 0, function* () {
    yield run_1.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_4.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_2.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_3.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_5.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_6.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_7.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_8.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_9.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_10.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_11.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_12.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_13.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_14.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_15.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_16.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_17.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_18.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_19.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_20.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_21.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_22.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_23.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
});
