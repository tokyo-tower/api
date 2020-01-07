"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 非同期ジョブ
 */
const cinerinoapi = require("@cinerino/api-nodejs-client");
const run_1 = require("./continuous/abortTasks/run");
const run_2 = require("./continuous/retryTasks/run");
const run_3 = require("./continuous/aggregateEventReservations/run");
const run_4 = require("./continuous/createPlaceOrderReport/run");
const run_5 = require("./continuous/createReturnOrderReport/run");
const run_6 = require("./continuous/returnOrdersByPerformance/run");
const run_7 = require("./continuous/updateOrderReportByReservation/run");
const run_8 = require("./triggered/createEvents/run");
const run_9 = require("./triggered/importEvents/run");
const run_10 = require("./triggered/makeAggregationsExpired/run");
const run_11 = require("./triggered/syncCheckinGates/run");
const MULTI_TENANT_SUPPORTED = process.env.MULTI_TENANT_SUPPORTED === '1';
const project = { typeOf: cinerinoapi.factory.organizationType.Project, id: process.env.PROJECT_ID };
exports.default = () => __awaiter(void 0, void 0, void 0, function* () {
    yield run_1.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_2.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_3.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_4.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_5.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_6.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_7.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_8.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_9.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_10.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
    yield run_11.default({ project: (MULTI_TENANT_SUPPORTED) ? project : undefined });
});
