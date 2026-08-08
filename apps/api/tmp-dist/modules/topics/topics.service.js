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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.topicsService = exports.TopicsService = void 0;
var database_1 = require("../../config/database");
var TopicsService = /** @class */ (function () {
    function TopicsService() {
    }
    TopicsService.prototype.slugify = function (value) {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .slice(0, 100);
    };
    TopicsService.prototype.ensureUniqueSlug = function (baseSlug) {
        return __awaiter(this, void 0, void 0, function () {
            var slug, existing, suffix, candidate;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        slug = this.slugify(baseSlug) || "topic";
                        return [4 /*yield*/, database_1.prisma.topic.findUnique({ where: { slug: slug } })];
                    case 1:
                        existing = _a.sent();
                        if (!existing) {
                            return [2 /*return*/, slug];
                        }
                        suffix = 2;
                        candidate = "".concat(slug, "-").concat(suffix);
                        _a.label = 2;
                    case 2: return [4 /*yield*/, database_1.prisma.topic.findUnique({ where: { slug: candidate } })];
                    case 3:
                        if (!_a.sent()) return [3 /*break*/, 4];
                        suffix += 1;
                        candidate = "".concat(slug, "-").concat(suffix);
                        return [3 /*break*/, 2];
                    case 4: return [2 /*return*/, candidate];
                }
            });
        });
    };
    TopicsService.prototype.createTopic = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var slug, uniqueSlug;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        slug = input.slug ? this.slugify(input.slug) : this.slugify(input.name);
                        return [4 /*yield*/, this.ensureUniqueSlug(slug || input.name)];
                    case 1:
                        uniqueSlug = _a.sent();
                        return [2 /*return*/, database_1.prisma.topic.create({
                                data: {
                                    name: input.name,
                                    slug: uniqueSlug,
                                    description: input.description,
                                    parent_category: input.parent_category,
                                },
                            })];
                }
            });
        });
    };
    TopicsService.prototype.listTopics = function () {
        return __awaiter(this, arguments, void 0, function (filters) {
            var where;
            if (filters === void 0) { filters = {}; }
            return __generator(this, function (_a) {
                where = {};
                if (filters.parent_category) {
                    where.parent_category = filters.parent_category;
                }
                if (filters.exclude_slug) {
                    where.slug = { not: filters.exclude_slug };
                }
                if (filters.active) {
                    where.polls = { some: { is_active: true } };
                }
                return [2 /*return*/, database_1.prisma.topic.findMany({
                        where: where,
                        orderBy: { created_at: "desc" },
                        take: filters.limit,
                    })];
            });
        });
    };
    TopicsService.prototype.getTopicBySlug = function (slug) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, database_1.prisma.topic.findUnique({ where: { slug: slug } })];
            });
        });
    };
    TopicsService.prototype.getTopicPollsBySlug = function (slug_1, sort_1) {
        return __awaiter(this, arguments, void 0, function (slug, sort, limit) {
            var orderBy;
            if (limit === void 0) { limit = 6; }
            return __generator(this, function (_a) {
                orderBy = [];
                if (sort === "latest") {
                    orderBy.push({ created_at: "desc" });
                }
                else {
                    orderBy.push({ votes: { _count: "desc" } });
                    if (sort === "trending") {
                        orderBy.push({ created_at: "desc" });
                    }
                }
                return [2 /*return*/, database_1.prisma.poll.findMany({
                        where: {
                            is_active: true,
                            topics: {
                                some: { slug: slug },
                            },
                        },
                        orderBy: orderBy,
                        take: limit,
                        select: {
                            id: true,
                            question: true,
                            options: true,
                            category: true,
                            is_commercial: true,
                            created_at: true,
                            end_date: true,
                            _count: {
                                select: {
                                    votes: true,
                                    opinions: true,
                                },
                            },
                        },
                    })];
            });
        });
    };
    TopicsService.prototype.updateTopic = function (id, input) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, database_1.prisma.topic.update({
                        where: { id: id },
                        data: input,
                    })];
            });
        });
    };
    TopicsService.prototype.getTopicByName = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, database_1.prisma.topic.findFirst({
                        where: { name: { equals: name, mode: "insensitive" } },
                    })];
            });
        });
    };
    TopicsService.prototype.deleteTopic = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, database_1.prisma.topic.delete({ where: { id: id } })];
            });
        });
    };
    return TopicsService;
}());
exports.TopicsService = TopicsService;
exports.topicsService = new TopicsService();
