"use strict";
const program = require("commander");
const AnalysisController_1 = require("./controllers/Analysis/AnalysisController");
const TestController_1 = require("./controllers/Test/TestController");
const StaffController_1 = require("./controllers/Staff/StaffController");
const SponsorController_1 = require("./controllers/Sponsor/SponsorController");
const PerformanceController_1 = require("./controllers/Performance/PerformanceController");
const TheaterController_1 = require("./controllers/Theater/TheaterController");
const FilmController_1 = require("./controllers/Film/FilmController");
const MemberController_1 = require("./controllers/Member/MemberController");
const ReservationController_1 = require("./controllers/Reservation/ReservationController");
const SchemaController_1 = require("./controllers/Schema/SchemaController");
const TelController_1 = require("./controllers/Tel/TelController");
const WindowController_1 = require("./controllers/Window/WindowController");
const PreCustomerController_1 = require("./controllers/PreCustomer/PreCustomerController");
const GMOController_1 = require("./controllers/GMO/GMOController");
const ReservationEmailCueController_1 = require("./controllers/ReservationEmailCue/ReservationEmailCueController");
let env = process.env.NODE_ENV || 'dev';
program
    .version('0.0.1');
program
    .command('test <method>')
    .description('テストタスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Test${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new TestController_1.default(logDir)[method]();
});
program
    .command('analysis <method>')
    .description('分析タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Analysis${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new AnalysisController_1.default(logDir)[method]();
});
program
    .command('gmo <method>')
    .description('GMO結果通知処理タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/GMO${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new GMOController_1.default(logDir)[method]();
});
program
    .command('staff <method>')
    .description('内部関係者タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Staff${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new StaffController_1.default(logDir)[method]();
});
program
    .command('createStaffReservationsByPerformanceId <performanceId>')
    .description('パフォーマンス指定で内部関係者の先抑えを行うタスク')
    .action((performanceId) => {
    let logDir = `${__dirname}/../../logs/${env}/task/StaffCreateReservationsByPerformanceId`;
    new StaffController_1.default(logDir).createReservationsByPerformanceId(performanceId);
});
program
    .command('sponsor <method>')
    .description('外部関係者タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Sponsor${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new SponsorController_1.default(logDir)[method]();
});
program
    .command('preCustomer <method>')
    .description('1.5次販売ユーザータスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/PreCustomer${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new PreCustomerController_1.default(logDir)[method]();
});
program
    .command('performance <method>')
    .description('パフォーマンスタスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Performance${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new PerformanceController_1.default(logDir)[method]();
});
program
    .command('releasePerformance <performanceId>')
    .description('ID指定でパフォーマンスを公開するタスク')
    .action((performanceId) => {
    let logDir = `${__dirname}/../../logs/${env}/task/PerformanceRelease`;
    (new PerformanceController_1.default(logDir)).release(performanceId);
});
program
    .command('theater <method>')
    .description('劇場タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Theater${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new TheaterController_1.default(logDir)[method]();
});
program
    .command('film <method>')
    .description('作品タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Film${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new FilmController_1.default(logDir)[method]();
});
program
    .command('member <method>')
    .description('メルマガ会員タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Member${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new MemberController_1.default(logDir)[method]();
});
program
    .command('tel <method>')
    .description('電話窓口タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Tel${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new TelController_1.default(logDir)[method]();
});
program
    .command('window <method>')
    .description('当日窓口タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Window${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new WindowController_1.default(logDir)[method]();
});
program
    .command('reservation <method>')
    .description('予約関連タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Reservation${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new ReservationController_1.default(logDir)[method]();
});
program
    .command('reservationEmailCue <method>')
    .description('予約メール関連タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/ReservationEmailCue${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new ReservationEmailCueController_1.default(logDir)[method]();
});
program
    .command('schema <method>')
    .description('スキーマ関連タスク')
    .action((method) => {
    let logDir = `${__dirname}/../../logs/${env}/task/Schema${method.charAt(0).toUpperCase()}${method.slice(1)}`;
    new SchemaController_1.default(logDir)[method]();
});
program.parse(process.argv);
