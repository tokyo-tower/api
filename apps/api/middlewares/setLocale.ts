import express = require('express');

export default (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    // TODO URLパラメータで言語管理
    if (req.params.locale) {
        req.setLocale(req.params.locale);
    }

    next();
};