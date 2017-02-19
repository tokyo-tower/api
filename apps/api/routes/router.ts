import * as express from 'express';
const router = express.Router();

import * as passport from 'passport';
import setLocale from '../middlewares/setLocale';

import * as AuthController from '../controllers/Auth/AuthController';
import * as OtherController from '../controllers/Other/OtherController';
import * as PerformanceController from '../controllers/Performance/PerformanceController';
import * as ReservationController from '../controllers/Reservation/ReservationController';
import * as ScreenController from '../controllers/Screen/ScreenController';

/**
 * URLルーティング
 */

// search performances
router.get('/:locale/performance/search', setLocale, PerformanceController.search);

// reservation email
router.post('/:locale/reservation/email', setLocale, ReservationController.email);

// show screen html
router.get('/screen/:id/show', ScreenController.show);



router.post('/login', setLocale, AuthController.login);

// 要認証サービス
router.all('/reservations', passport.authenticate('bearer', { session: false }), setLocale, ReservationController.findByMvtkUser);
router.all('/reservation/:id', passport.authenticate('bearer', { session: false }), setLocale, ReservationController.findById);

// enter
router.post('/reservation/:id/enter', setLocale, ReservationController.enter);

// 環境変数
router.get('/environmentVariables', OtherController.environmentVariables);


// 404
router.use((req, res) => {
    res.json({
        success: false,
        message: `router for [${req.originalUrl}] not found.`
    });
});

// error handlers
router.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);

    res.status(400);
    res.json({
        success: false,
        message: 'Internal Server Error'
    });
});


export default router;