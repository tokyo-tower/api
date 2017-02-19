// tslint:disable-next-line:no-reference
/// <reference path='../typings/index.d.ts' />

/**
 * タスクコマンドルーター
 *
 * @ignore
 */

import * as program from 'commander';
import AnalysisController from '../apps/task/controllers/Analysis/AnalysisController';
import FilmController from '../apps/task/controllers/Film/FilmController';
import GMOController from '../apps/task/controllers/GMO/GMOController';
import MemberController from '../apps/task/controllers/Member/MemberController';
import PerformanceController from '../apps/task/controllers/Performance/PerformanceController';
import PreCustomerController from '../apps/task/controllers/PreCustomer/PreCustomerController';
import ReservationController from '../apps/task/controllers/Reservation/ReservationController';
import ReservationEmailCueController from '../apps/task/controllers/ReservationEmailCue/ReservationEmailCueController';
import SchemaController from '../apps/task/controllers/Schema/SchemaController';
import SponsorController from '../apps/task/controllers/Sponsor/SponsorController';
import StaffController from '../apps/task/controllers/Staff/StaffController';
import TelController from '../apps/task/controllers/Tel/TelController';
import TestController from '../apps/task/controllers/Test/TestController';
import TheaterController from '../apps/task/controllers/Theater/TheaterController';
import WindowController from '../apps/task/controllers/Window/WindowController';

const env = process.env.NODE_ENV || 'dev';

program
    .version('0.0.1');

program
    .command('test <method>')
    .description('テストタスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Test${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new TestController(logDir))[method]();
    });

program
    .command('analysis <method>')
    .description('分析タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Analysis${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new AnalysisController(logDir))[method]();
    });

program
    .command('gmo <method>')
    .description('GMO結果通知処理タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/GMO${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new GMOController(logDir))[method]();
    });

program
    .command('staff <method>')
    .description('内部関係者タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Staff${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new StaffController(logDir))[method]();
    });

program
    .command('createStaffReservationsByPerformanceId <performanceId>')
    .description('パフォーマンス指定で内部関係者の先抑えを行うタスク')
    .action((performanceId) => {
        const logDir = `${__dirname}/../../logs/${env}/task/StaffCreateReservationsByPerformanceId`;
        (<any>new StaffController(logDir)).createReservationsByPerformanceId(performanceId);
    });

program
    .command('sponsor <method>')
    .description('外部関係者タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Sponsor${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new SponsorController(logDir))[method]();
    });

program
    .command('preCustomer <method>')
    .description('1.5次販売ユーザータスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/PreCustomer${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new PreCustomerController(logDir))[method]();
    });

program
    .command('performance <method>')
    .description('パフォーマンスタスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Performance${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new PerformanceController(logDir))[method]();
    });

program
    .command('releasePerformance <performanceId>')
    .description('ID指定でパフォーマンスを公開するタスク')
    .action((performanceId) => {
        const logDir = `${__dirname}/../../logs/${env}/task/PerformanceRelease`;
        (new PerformanceController(logDir)).release(performanceId);
    });

program
    .command('theater <method>')
    .description('劇場タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Theater${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new TheaterController(logDir))[method]();
    });

program
    .command('film <method>')
    .description('作品タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Film${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new FilmController(logDir))[method]();
    });

program
    .command('member <method>')
    .description('メルマガ会員タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Member${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new MemberController(logDir))[method]();
    });

program
    .command('tel <method>')
    .description('電話窓口タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Tel${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new TelController(logDir))[method]();
    });

program
    .command('window <method>')
    .description('当日窓口タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Window${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new WindowController(logDir))[method]();
    });

program
    .command('reservation <method>')
    .description('予約関連タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Reservation${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new ReservationController(logDir))[method]();
    });

program
    .command('reservationEmailCue <method>')
    .description('予約メール関連タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/ReservationEmailCue${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new ReservationEmailCueController(logDir))[method]();
    });

program
    .command('schema <method>')
    .description('スキーマ関連タスク')
    .action((method) => {
        const logDir = `${__dirname}/../../logs/${env}/task/Schema${method.charAt(0).toUpperCase()}${method.slice(1)}`;
        (<any>new SchemaController(logDir))[method]();
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
