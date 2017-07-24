import * as express from 'express';

const router = express.Router();

import authentication from '../middlewares/authentication';
import permitScopes from '../middlewares/permitScopes';
import setLocale from '../middlewares/setLocale';
import validator from '../middlewares/validator';

import * as PerformanceController from '../controllers/performance';
import * as ReservationController from '../controllers/reservation';
import * as ScreenController from '../controllers/screen';

router.use(authentication);

/**
 * URLルーティング
 */

// search performances
router.get(
    '/:locale/performance/search',
    permitScopes(['performances', 'performances.read-only']),
    setLocale,
    PerformanceController.search
);

// 予約メール転送
router.post(
    '/:locale/reservation/:id/transfer',
    permitScopes(['reservations', 'reservations.read-only']),
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
    permitScopes(['screens', 'screens.read-only']),
    (__1, __2, next) => {
        next();
    },
    validator,
    ScreenController.show
);

// 入場
router.post(
    '/reservation/:id/checkin',
    permitScopes(['reservations', 'reservations.checkins']),
    setLocale,
    (__1, __2, next) => {
        next();
    },
    validator,
    ReservationController.checkin
);

export default router;
