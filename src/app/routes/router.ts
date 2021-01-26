/**
 * ルーティング
 */
import { Router } from 'express';

import healthRouter from './health';
import projectDetailRouter from './projects/detail';
import statsRouter from './stats';
import webhooksRouter from './webhooks';

import authentication from '../middlewares/authentication';
import rateLimit from '../middlewares/rateLimit';
import setProject from '../middlewares/setProject';

const router = Router();

// 認証不要なルーター
router.use('/health', healthRouter);
router.use('/stats', statsRouter);
router.use('/webhooks', webhooksRouter);

// リクエストプロジェクト設定
router.use(setProject);

// 認証
router.use(authentication);

// レート制限
router.use(rateLimit);

// 要認証なルーター↓
// 以下、プロジェクト指定済の状態でルーティング
router.use('/projects/:id', projectDetailRouter);

export default router;
