import * as express from 'express';
const router = express.Router();

// import * as passport from 'passport';
import setLocale from '../middlewares/setLocale';

// import * as AuthController from '../controllers/auth';
import * as PerformanceController from '../controllers/performance';
import * as ReservationController from '../controllers/reservation';
import * as ScreenController from '../controllers/screen';

/**
 * URLルーティング
 */

// search performances
router.get('/:locale/performance/search', setLocale, PerformanceController.search);

// reservation email
router.post('/:locale/reservation/email', setLocale, ReservationController.email);

// show screen html
router.get('/screen/:id/show', ScreenController.show);

// router.post('/login', setLocale, AuthController.login);

// 要認証サービス
// router.all('/reservations', passport.authenticate('bearer', { session: false }), setLocale, ReservationController.findByMvtkUser);
// router.all('/reservation/:id', passport.authenticate('bearer', { session: false }), setLocale, ReservationController.findById);

// 入場
router.post('/reservation/:id/checkin', setLocale, ReservationController.checkin);

export default router;
