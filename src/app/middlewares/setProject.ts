/**
 * リクエストプロジェクト設定ルーター
 */
import * as ttts from '@tokyotower/domain';
import * as express from 'express';

const PROJECT_ID = process.env.PROJECT_ID;

const setProject = express.Router();

// プロジェクト指定ルーティング配下については、すべてreq.projectを上書き
setProject.use((req, _, next) => {
    if (typeof PROJECT_ID === 'string' && PROJECT_ID.length > 0) {
        req.project = { typeOf: ttts.factory.chevre.organizationType.Project, id: PROJECT_ID };
    }

    next();
});

// プロジェクト指定ルーティング配下については、すべてreq.projectを上書き
setProject.use(
    '/projects/:id',
    async (req, _, next) => {
        req.project = { typeOf: ttts.factory.chevre.organizationType.Project, id: req.params.id };

        next();
    }
);

export default setProject;
