import * as express from 'express';
const router = express.Router();

// import * as passport from 'passport';
import setLocale from '../middlewares/setLocale';
import validator from '../middlewares/validator';

// import * as AuthController from '../controllers/auth';
import * as PerformanceController from '../controllers/performance';
import * as ReservationController from '../controllers/reservation';
import * as ScreenController from '../controllers/screen';

/**
 * URLルーティング
 */

// search performances
router.get('/:locale/performance/search', setLocale, PerformanceController.search);

// 予約メール転送
router.post(
    '/:locale/reservation/:id/transfer',
    setLocale,
    (req, __, next) => {
        // メールアドレスの有効性チェック
        req.checkBody('to', 'invalid to')
            .isEmail().withMessage(req.__('Message.invalid{{fieldName}}', { fieldName: req.__('Form.FieldName.email') }));

        next();
    },
    validator,
    ReservationController.transfer
);

// show screen html
router.get(
    '/screen/:id/show',
    (__1, __2, next) => {
        next();
    },
    validator,
    ScreenController.show
);

// router.post('/login', setLocale, AuthController.login);

// 要認証サービス
// router.all('/reservations', passport.authenticate('bearer', { session: false }), setLocale, ReservationController.findByMvtkUser);
// router.all('/reservation/:id', passport.authenticate('bearer', { session: false }), setLocale, ReservationController.findById);

// 入場
router.post('/reservation/:id/checkin', setLocale, ReservationController.checkin);

export default router;
