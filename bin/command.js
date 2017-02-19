// tslint:disable-next-line:no-reference
/// <reference path='../typings/index.d.ts' />
"use strict";
/**
 * タスクコマンドルーター
 *
 * @ignore
 */
const program = require("commander");
const AnalysisController_1 = require("../apps/task/controllers/Analysis/AnalysisController");
const FilmController_1 = require("../apps/task/controllers/Film/FilmController");
const GMOController_1 = require("../apps/task/controllers/GMO/GMOController");
const MemberController_1 = require("../apps/task/controllers/Member/MemberController");
const PerformanceController_1 = require("../apps/task/controllers/Performance/PerformanceController");
const PreCustomerController_1 = require("../apps/task/controllers/PreCustomer/PreCustomerController");
const ReservationController_1 = require("../apps/task/controllers/Reservation/ReservationController");
const ReservationEmailCueController_1 = require("../apps/task/controllers/ReservationEmailCue/ReservationEmailCueController");
const SchemaController_1 = require("../apps/task/controllers/Schema/SchemaController");
const SponsorController_1 = require("../apps/task/controllers/Sponsor/SponsorController");
const StaffController_1 = require("../apps/task/controllers/Staff/StaffController");
const TelController_1 = require("../apps/task/controllers/Tel/TelController");
const TestController_1 = require("../apps/task/controllers/Test/TestController");
const TheaterController_1 = require("../apps/task/controllers/Theater/TheaterController");
const WindowController_1 = require("../apps/task/controllers/Window/WindowController");
const env = process.env.NODE_ENV || 'dev';
program
    .version('0.0.1');
program
    .command('test <method>')
    .description('テストタスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Test${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new TestController_1.default(logDir)[method]();
});
program
    .command('analysis <method>')
    .description('分析タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Analysis${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new AnalysisController_1.default(logDir)[method]();
});
program
    .command('gmo <method>')
    .description('GMO結果通知処理タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/GMO${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new GMOController_1.default(logDir)[method]();
});
program
    .command('staff <method>')
    .description('内部関係者タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Staff${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new StaffController_1.default(logDir)[method]();
});
program
    .command('createStaffReservationsByPerformanceId <performanceId>')
    .description('パフォーマンス指定で内部関係者の先抑えを行うタスク')
    .action((performanceId) => {
    const logDir = `${__dirname}/../../logs/${env}/task/StaffCreateReservationsByPerformanceId`;
    new StaffController_1.default(logDir).createReservationsByPerformanceId(performanceId);
});
program
    .command('sponsor <method>')
    .description('外部関係者タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Sponsor${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new SponsorController_1.default(logDir)[method]();
});
program
    .command('preCustomer <method>')
    .description('1.5次販売ユーザータスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/PreCustomer${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new PreCustomerController_1.default(logDir)[method]();
});
program
    .command('performance <method>')
    .description('パフォーマンスタスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Performance${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new PerformanceController_1.default(logDir)[method]();
});
program
    .command('releasePerformance <performanceId>')
    .description('ID指定でパフォーマンスを公開するタスク')
    .action((performanceId) => {
    const logDir = `${__dirname}/../../logs/${env}/task/PerformanceRelease`;
    (new PerformanceController_1.default(logDir)).release(performanceId);
});
program
    .command('theater <method>')
    .description('劇場タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Theater${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new TheaterController_1.default(logDir)[method]();
});
program
    .command('film <method>')
    .description('作品タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Film${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new FilmController_1.default(logDir)[method]();
});
program
    .command('member <method>')
    .description('メルマガ会員タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Member${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new MemberController_1.default(logDir)[method]();
});
program
    .command('tel <method>')
    .description('電話窓口タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Tel${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new TelController_1.default(logDir)[method]();
});
program
    .command('window <method>')
    .description('当日窓口タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Window${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new WindowController_1.default(logDir)[method]();
});
program
    .command('reservation <method>')
    .description('予約関連タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Reservation${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new ReservationController_1.default(logDir)[method]();
});
program
    .command('reservationEmailCue <method>')
    .description('予約メール関連タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/ReservationEmailCue${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new ReservationEmailCueController_1.default(logDir)[method]();
});
program
    .command('schema <method>')
    .description('スキーマ関連タスク')
    .action((method) => {
    const logDir = `${__dirname}/../../logs/${env}/task/Schema${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new SchemaController_1.default(logDir)[method]();
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
