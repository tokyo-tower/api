// tslint:disable-next-line:no-reference
/// <reference path='../typings/index.d.ts' />
"use strict";
/**
 * タスクコマンドルーター
 *
 * @ignore
 */
const program = require("commander");
const AnalysisController = require("../apps/task/controllers/analysis");
const FilmController = require("../apps/task/controllers/film");
const GMOController = require("../apps/task/controllers/gmo");
const MemberController = require("../apps/task/controllers/member");
const PerformanceController = require("../apps/task/controllers/performance");
const PreCustomerController = require("../apps/task/controllers/preCustomer");
const ReservationController = require("../apps/task/controllers/reservation");
const ReservationEmailCueController = require("../apps/task/controllers/reservationEmailCue");
const SchemaController = require("../apps/task/controllers/schema");
const SponsorController = require("../apps/task/controllers/sponsor");
const StaffController = require("../apps/task/controllers/staff");
const TelController = require("../apps/task/controllers/tel");
const TestController = require("../apps/task/controllers/test");
const TheaterController = require("../apps/task/controllers/theater");
const WindowController = require("../apps/task/controllers/window");
program
    .version('0.0.1');
program
    .command('test <method>')
    .description('テストタスク')
    .action((method) => {
    TestController[method]();
});
program
    .command('analysis <method>')
    .description('分析タスク')
    .action((method) => {
    AnalysisController[method]();
});
program
    .command('gmo <method>')
    .description('GMO結果通知処理タスク')
    .action((method) => {
    GMOController[method]();
});
program
    .command('staff <method>')
    .description('内部関係者タスク')
    .action((method) => {
    StaffController[method]();
});
program
    .command('createStaffReservationsByPerformanceId <performanceId>')
    .description('パフォーマンス指定で内部関係者の先抑えを行うタスク')
    .action((performanceId) => {
    StaffController.createReservationsByPerformanceId(performanceId);
});
program
    .command('sponsor <method>')
    .description('外部関係者タスク')
    .action((method) => {
    SponsorController[method]();
});
program
    .command('preCustomer <method>')
    .description('1.5次販売ユーザータスク')
    .action((method) => {
    PreCustomerController[method]();
});
program
    .command('performance <method>')
    .description('パフォーマンスタスク')
    .action((method) => {
    PerformanceController[method]();
});
program
    .command('releasePerformance <performanceId>')
    .description('ID指定でパフォーマンスを公開するタスク')
    .action((performanceId) => {
    PerformanceController.release(performanceId);
});
program
    .command('theater <method>')
    .description('劇場タスク')
    .action((method) => {
    TheaterController[method]();
});
program
    .command('film <method>')
    .description('作品タスク')
    .action((method) => {
    FilmController[method]();
});
program
    .command('member <method>')
    .description('メルマガ会員タスク')
    .action((method) => {
    MemberController[method]();
});
program
    .command('tel <method>')
    .description('電話窓口タスク')
    .action((method) => {
    TelController[method]();
});
program
    .command('window <method>')
    .description('当日窓口タスク')
    .action((method) => {
    WindowController[method]();
});
program
    .command('reservation <method>')
    .description('予約関連タスク')
    .action((method) => {
    ReservationController[method]();
});
program
    .command('reservationEmailCue <method>')
    .description('予約メール関連タスク')
    .action((method) => {
    ReservationEmailCueController[method]();
});
program
    .command('schema <method>')
    .description('スキーマ関連タスク')
    .action((method) => {
    SchemaController[method]();
});
// program
//     .command('log <method>')
//     .description('ログ関連タスク')
//     .action((method) => {
//         let logDir = `${__dirname}/../../logs/${env}/task/Log${method.charAt(0).toUpperCase()}${method.slice(1)}`;
//         (new LogController(logDir))[method]();
//     });
// program
//   .command('*')
//   .action(function(env){
//     console.log('deploying "%s"', env);
//   });
program.parse(process.argv);
