// tslint:disable-next-line:no-reference
/// <reference path='../typings/index.d.ts' />

/**
 * タスクコマンドルーター
 *
 * @ignore
 */

import * as program from 'commander';
import * as AnalysisController from '../apps/task/controllers/analysis';
import * as FilmController from '../apps/task/controllers/film';
import * as GMOController from '../apps/task/controllers/gmo';
import * as MemberController from '../apps/task/controllers/member';
import * as PerformanceController from '../apps/task/controllers/performance';
import * as ReservationController from '../apps/task/controllers/reservation';
import * as ReservationEmailCueController from '../apps/task/controllers/reservationEmailCue';
import * as SchemaController from '../apps/task/controllers/schema';
import * as StaffController from '../apps/task/controllers/staff';
import * as TestController from '../apps/task/controllers/test';
import * as TheaterController from '../apps/task/controllers/theater';
import * as WindowController from '../apps/task/controllers/window';

program
    .version('0.0.1');

program
    .command('test <method>')
    .description('テストタスク')
    .action((method) => {
        (<any>TestController)[method]();
    });

program
    .command('analysis <method>')
    .description('分析タスク')
    .action((method) => {
        (<any>AnalysisController)[method]();
    });

program
    .command('gmo <method>')
    .description('GMO結果通知処理タスク')
    .action((method) => {
        (<any>GMOController)[method]();
    });

program
    .command('staff <method>')
    .description('内部関係者タスク')
    .action((method) => {
        (<any>StaffController)[method]();
    });

program
    .command('createStaffReservationsByPerformanceId <performanceId>')
    .description('パフォーマンス指定で内部関係者の先抑えを行うタスク')
    .action(async (performanceId) => {
        await StaffController.createReservationsByPerformanceId(performanceId);
    });

program
    .command('performance <method>')
    .description('パフォーマンスタスク')
    .action((method) => {
        (<any>PerformanceController)[method]();
    });

program
    .command('performance updateStatuses')
    .description('空席状況更新タスク')
    .action(async () => {
        await PerformanceController.updateStatuses();
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
        (<any>TheaterController)[method]();
    });

program
    .command('film <method>')
    .description('作品タスク')
    .action((method) => {
        (<any>FilmController)[method]();
    });

program
    .command('member <method>')
    .description('メルマガ会員タスク')
    .action((method) => {
        (<any>MemberController)[method]();
    });

program
    .command('window <method>')
    .description('当日窓口タスク')
    .action((method) => {
        (<any>WindowController)[method]();
    });

program
    .command('reservation <method>')
    .description('予約関連タスク')
    .action((method) => {
        (<any>ReservationController)[method]();
    });

program
    .command('reservationEmailCue <method>')
    .description('予約メール関連タスク')
    .action((method) => {
        (<any>ReservationEmailCueController)[method]();
    });

program
    .command('schema <method>')
    .description('スキーマ関連タスク')
    .action((method) => {
        (<any>SchemaController)[method]();
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
