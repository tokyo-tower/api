"use strict";
/**
 * 組織ルーター
 * @namespace rouets.organizations
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const organizationsRouter = express_1.Router();
const ttts = require("@motionpicture/ttts-domain");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
organizationsRouter.use(authentication_1.default);
/**
 * 識別子で企業組織を検索
 */
organizationsRouter.get('/corporation/:identifier', permitScopes_1.default(['organizations', 'organizations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const organization = yield organizationRepo.findCorporationByIdentifier(req.params.identifier);
        res.json(organization);
    }
    catch (error) {
        next(error);
    }
}));
organizationsRouter.get('/movieTheater', permitScopes_1.default(['organizations', 'organizations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const organizationRepo = new ttts.repository.Organization(ttts.mongoose.connection);
        const searchCoinditions = {
            // tslint:disable-next-line:no-magic-numbers
            limit: (req.query.limit !== undefined) ? Math.min(req.query.limit, 100) : 100,
            page: (req.query.page !== undefined) ? Math.max(req.query.page, 1) : 1,
            sort: req.query.sort,
            name: req.query.name
        };
        const organizations = yield organizationRepo.searchCorporations(searchCoinditions);
        const totalCount = yield organizationRepo.countCorporations(searchCoinditions);
        res.set('X-Total-Count', totalCount.toString());
        res.json(organizations);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = organizationsRouter;
