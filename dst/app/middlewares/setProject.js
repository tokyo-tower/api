"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * リクエストプロジェクト設定ルーター
 */
const ttts = require("@tokyotower/domain");
const express = require("express");
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
setProject.use('/projects/:id', (req, _, next) => __awaiter(void 0, void 0, void 0, function* () {
    req.project = { typeOf: ttts.factory.chevre.organizationType.Project, id: req.params.id };
    next();
}));
exports.default = setProject;
