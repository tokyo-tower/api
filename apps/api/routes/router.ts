import express = require('express')
let router = express.Router();

import passport = require('passport');

import AuthController from '../controllers/Auth/AuthController';
import PerformanceController from '../controllers/Performance/PerformanceController';
import ReservationController from '../controllers/Reservation/ReservationController';
import ScreenController from '../controllers/Screen/ScreenController';
import OtherController from '../controllers/Other/OtherController';


/**
 * URLルーティング
 * 
 * router.get(パス, ルーティング名称, メソッド);
 * といった形でルーティングを登録する
 * ルーティング名称は、ejs側やコントローラーでURLを生成する際に用いたりするので、意識的にページ一意な値を定めること
 * 
 * リクエスト毎に、req,res,nextでコントローラーインスタンスを生成して、URLに応じたメソッドを実行する、という考え方
 */





// search performances
router.get('/:locale/performance/search', (req, res, next) => { (new PerformanceController(req, res, next)).search() });

// reservation email
router.post('/:locale/reservation/email', (req, res, next) => { (new ReservationController(req, res, next)).email() });

// show screen html
router.get('/screen/:id/show', (req, res, next) => { (new ScreenController(req, res, next)).show() });






router.post('/login', (req, res, next) => { (new AuthController(req, res, next)).login() });

// 要認証サービス
router.all('/reservations', passport.authenticate('bearer', { session: false }), (req, res, next) => { (new ReservationController(req, res, next)).findByMvtkUser() });
router.all('/reservation/:id', passport.authenticate('bearer', { session: false }), (req, res, next) => { (new ReservationController(req, res, next)).findById() });

// enter
router.post('/reservation/:id/enter', (req, res, next) => { (new ReservationController(req, res, next)).enter() });

// 環境変数
router.get('/environmentVariables', (req, res, next) => { (new OtherController(req, res, next)).environmentVariables() });


// 404
router.use((req, res) => {
    res.json({
        success: false,
        message: `router for [${req.originalUrl}] not found.`
    });
});

// error handlers
router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(req.originalUrl, req.query, req.params, req.body, err);
    if (res.headersSent) return next(err);

    res.status(400);
    res.json({
        success: false,
        message: 'Internal Server Error'
    });
});


export default router;