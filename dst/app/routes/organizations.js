"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 組織ルーター
 */
const express_1 = require("express");
const ttts = require("@motionpicture/ttts-domain");
const authentication_1 = require("../middlewares/authentication");
const permitScopes_1 = require("../middlewares/permitScopes");
const validator_1 = require("../middlewares/validator");
const organizationsRouter = express_1.Router();
organizationsRouter.use(authentication_1.default);
/**
 * 識別子で企業組織を検索
 * @deprecated Use /sellers/:id
 */
organizationsRouter.get('/corporation/:identifier', permitScopes_1.default(['organizations', 'organizations.read-only']), validator_1.default, (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    try {
        const sellerRepo = new ttts.repository.Seller(ttts.mongoose.connection);
        const doc = yield sellerRepo.organizationModel.findOne({
            identifier: req.params.identifier
        }, {
            __v: 0,
            createdAt: 0,
            updatedAt: 0,
            // GMOのセキュアな情報を公開しないように注意
            'gmoInfo.shopPass': 0,
            'paymentAccepted.gmoInfo.shopPass': 0
        })
            .exec();
        if (doc === null) {
            throw new ttts.factory.errors.NotFound('Seller');
        }
        res.json(doc.toObject());
    }
    catch (error) {
        next(error);
    }
}));
exports.default = organizationsRouter;
