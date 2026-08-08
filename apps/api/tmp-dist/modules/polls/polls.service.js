"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.pollsService = exports.PollsService = void 0;
var client_1 = require("@prisma/client");
var logger_1 = require("../../common/interceptors/logger");
var topics_service_1 = require("../topics/topics.service");
var prisma = new client_1.PrismaClient();
var PollsService = /** @class */ (function () {
    function PollsService() {
    }
    PollsService.prototype.createPoll = function (adminId, input) {
        return __awaiter(this, void 0, void 0, function () {
            var region, isBlackoutActive, status, isActive, poll, topicNames, topicRecords, estimatedReach;
            var _this = this;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!(input.category === "POLITICS")) return [3 /*break*/, 2];
                        region = typeof ((_a = input.target_filters) === null || _a === void 0 ? void 0 : _a.region) === "string" ? input.target_filters.region : "ALL";
                        return [4 /*yield*/, this.isElectionBlackoutActive(region)];
                    case 1:
                        isBlackoutActive = _g.sent();
                        if (isBlackoutActive) {
                            throw new Error("Political polls are disabled during the active election blackout period for this region.");
                        }
                        _g.label = 2;
                    case 2:
                        status = (_b = input.status) !== null && _b !== void 0 ? _b : (input.is_active === true ? "ACTIVE" : "DRAFT");
                        isActive = status === "ACTIVE";
                        return [4 /*yield*/, prisma.poll.create({
                                data: {
                                    question: input.question,
                                    options: input.options,
                                    category: input.category,
                                    sub_category: input.sub_category,
                                    start_date: input.start_date ? new Date(input.start_date) : new Date(),
                                    end_date: input.end_date ? new Date(input.end_date) : null,
                                    target_filters: input.target_filters || {},
                                    is_commercial: input.is_commercial,
                                    sponsor_id: input.sponsor_id,
                                    created_by: adminId,
                                    status: status,
                                    is_active: isActive,
                                    seo_title: input.seo_title,
                                    meta_description: input.meta_description,
                                    slug: (_c = input.slug) !== null && _c !== void 0 ? _c : this.createSlug(input.question),
                                    keywords: (_d = input.keywords) !== null && _d !== void 0 ? _d : [],
                                    hashtags: (_e = input.hashtags) !== null && _e !== void 0 ? _e : [],
                                    facebook_caption: input.facebook_caption,
                                    instagram_caption: input.instagram_caption,
                                    x_caption: input.x_caption,
                                    whatsapp_share_text: input.whatsapp_share_text,
                                    ai_summary: input.ai_summary,
                                    faq: (_f = input.faq) !== null && _f !== void 0 ? _f : [],
                                    og_title: input.og_title,
                                    og_description: input.og_description,
                                },
                            })];
                    case 3:
                        poll = _g.sent();
                        if (!(input.topic_names && input.topic_names.length > 0)) return [3 /*break*/, 6];
                        topicNames = Array.from(new Set(input.topic_names.filter(Boolean)));
                        return [4 /*yield*/, Promise.all(topicNames.map(function (name) { return __awaiter(_this, void 0, void 0, function () {
                                var normalizedName, existing;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            normalizedName = name.trim();
                                            return [4 /*yield*/, topics_service_1.topicsService.getTopicByName(normalizedName)];
                                        case 1:
                                            existing = _a.sent();
                                            if (existing) {
                                                return [2 /*return*/, existing];
                                            }
                                            return [2 /*return*/, topics_service_1.topicsService.createTopic({ name: normalizedName, slug: this.createSlug(normalizedName) })];
                                    }
                                });
                            }); }))];
                    case 4:
                        topicRecords = _g.sent();
                        return [4 /*yield*/, prisma.poll.update({
                                where: { id: poll.id },
                                data: {
                                    topics: {
                                        connect: topicRecords.map(function (topic) { return ({ id: topic.id }); }),
                                    },
                                },
                            })];
                    case 5:
                        _g.sent();
                        _g.label = 6;
                    case 6: return [4 /*yield*/, this.calculateEstimatedReach(input.target_filters)];
                    case 7:
                        estimatedReach = _g.sent();
                        return [4 /*yield*/, prisma.poll.update({
                                where: { id: poll.id },
                                data: { estimated_reach: estimatedReach },
                            })];
                    case 8:
                        _g.sent();
                        return [2 /*return*/, __assign(__assign({}, poll), { estimated_reach: estimatedReach })];
                }
            });
        });
    };
    PollsService.prototype.createSlug = function (value) {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .slice(0, 100);
    };
    PollsService.prototype.getPendingPolls = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, polls, total;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            prisma.poll.findMany({
                                where: { status: { in: ["DRAFT", "PENDING_REVIEW"] }, is_active: false },
                                orderBy: { created_at: "desc" },
                                skip: (query.page - 1) * query.limit,
                                take: query.limit,
                            }),
                            prisma.poll.count({ where: { status: { in: ["DRAFT", "PENDING_REVIEW"] }, is_active: false } }),
                        ])];
                    case 1:
                        _a = _b.sent(), polls = _a[0], total = _a[1];
                        return [2 /*return*/, {
                                polls: polls.map(function (poll) { return ({
                                    id: poll.id,
                                    question: poll.question,
                                    category: poll.category,
                                    status: poll.status,
                                    created_at: poll.created_at,
                                }); }),
                                pagination: {
                                    page: query.page,
                                    limit: query.limit,
                                    total: total,
                                    total_pages: Math.ceil(total / query.limit),
                                },
                            }];
                }
            });
        });
    };
    PollsService.prototype.approvePoll = function (pollId) {
        return __awaiter(this, void 0, void 0, function () {
            var poll;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.poll.update({
                            where: { id: pollId },
                            data: { status: "ACTIVE", is_active: true, start_date: new Date() },
                        })];
                    case 1:
                        poll = _a.sent();
                        return [4 /*yield*/, this.assignPollToUsers(poll.id, poll.target_filters)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, poll];
                }
            });
        });
    };
    PollsService.prototype.rejectPoll = function (pollId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma.poll.update({
                        where: { id: pollId },
                        data: { status: "REJECTED", is_active: false },
                    })];
            });
        });
    };
    PollsService.prototype.publishPoll = function (pollId) {
        return __awaiter(this, void 0, void 0, function () {
            var poll;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.poll.update({
                            where: { id: pollId },
                            data: { status: "ACTIVE", is_active: true, start_date: new Date() },
                        })];
                    case 1:
                        poll = _a.sent();
                        return [4 /*yield*/, this.assignPollToUsers(poll.id, poll.target_filters)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, poll];
                }
            });
        });
    };
    PollsService.prototype.getPollById = function (pollId, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var poll, voteDistribution, totalVotes, results, userVote, userOpinion, userPrediction;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, prisma.poll.findUnique({
                            where: { id: pollId },
                            include: {
                                _count: { select: { votes: true, opinions: true } },
                            },
                        })];
                    case 1:
                        poll = _c.sent();
                        if (!poll) {
                            throw new Error("Poll not found");
                        }
                        return [4 /*yield*/, prisma.vote.groupBy({
                                by: ["option_index"],
                                where: { poll_id: pollId },
                                _count: { option_index: true },
                            })];
                    case 2:
                        voteDistribution = _c.sent();
                        totalVotes = poll._count.votes;
                        results = poll.options.map(function (option, index) {
                            var _a;
                            var voteData = voteDistribution.find(function (v) { return v.option_index === index; });
                            var count = ((_a = voteData === null || voteData === void 0 ? void 0 : voteData._count) === null || _a === void 0 ? void 0 : _a.option_index) || 0;
                            return {
                                option: option,
                                index: index,
                                count: count,
                                percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
                            };
                        });
                        userVote = null;
                        userOpinion = null;
                        userPrediction = null;
                        if (!userId) return [3 /*break*/, 6];
                        return [4 /*yield*/, prisma.vote.findUnique({
                                where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
                            })];
                    case 3:
                        userVote = _c.sent();
                        return [4 /*yield*/, prisma.opinion.findUnique({
                                where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
                            })];
                    case 4:
                        userOpinion = _c.sent();
                        return [4 /*yield*/, prisma.pollPrediction.findUnique({
                                where: { user_id_poll_id: { user_id: userId, poll_id: pollId } },
                            })];
                    case 5:
                        userPrediction = _c.sent();
                        _c.label = 6;
                    case 6: return [2 /*return*/, __assign(__assign({}, poll), { is_commercial: (_a = poll.is_commercial) !== null && _a !== void 0 ? _a : false, total_votes: totalVotes, total_opinions: poll._count.opinions, results: results, has_voted: !!userVote, user_vote_index: (_b = userVote === null || userVote === void 0 ? void 0 : userVote.option_index) !== null && _b !== void 0 ? _b : null, has_opinion: !!userOpinion, user_opinion: userOpinion
                                ? {
                                    id: userOpinion.id,
                                    content: userOpinion.content,
                                    agree_count: userOpinion.agree_count,
                                    disagree_count: userOpinion.disagree_count,
                                }
                                : null, user_prediction: userPrediction ? userPrediction.predicted_percentage : null })];
                }
            });
        });
    };
    PollsService.prototype.savePrediction = function (userId, pollId, input) {
        return __awaiter(this, void 0, void 0, function () {
            var poll, existing;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.poll.findUnique({ where: { id: pollId }, select: { id: true, status: true, is_active: true } })];
                    case 1:
                        poll = _a.sent();
                        if (!poll || !poll.is_active || poll.status !== "ACTIVE") {
                            throw new Error("Prediction is only available for active polls");
                        }
                        return [4 /*yield*/, prisma.pollPrediction.findUnique({ where: { user_id_poll_id: { user_id: userId, poll_id: pollId } } })];
                    case 2:
                        existing = _a.sent();
                        if (existing) {
                            return [2 /*return*/, prisma.pollPrediction.update({
                                    where: { id: existing.id },
                                    data: { predicted_percentage: input.predicted_percentage },
                                })];
                        }
                        return [2 /*return*/, prisma.pollPrediction.create({
                                data: {
                                    user_id: userId,
                                    poll_id: pollId,
                                    predicted_percentage: input.predicted_percentage,
                                },
                            })];
                }
            });
        });
    };
    PollsService.prototype.getEstimatedReach = function (filters) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.calculateEstimatedReach(filters)];
            });
        });
    };
    PollsService.prototype.getPolls = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var where, region, isBlackoutActive, _a, polls, total;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        where = {};
                        region = typeof query.region === "string" && query.region ? query.region : "ALL";
                        if (query.category && query.category !== "ALL") {
                            where.category = query.category;
                        }
                        if (typeof query.search === "string" && query.search.trim()) {
                            where.question = {
                                contains: query.search.trim(),
                                mode: "insensitive",
                            };
                        }
                        if (query.status !== "ALL") {
                            where.status = query.status;
                        }
                        where.is_active = true;
                        where.status = "ACTIVE";
                        return [4 /*yield*/, this.isElectionBlackoutActive(region)];
                    case 1:
                        isBlackoutActive = _b.sent();
                        if (isBlackoutActive) {
                            if (!query.category || query.category === "ALL" || query.category === "POLITICS") {
                                where.category = { not: "POLITICS" };
                            }
                        }
                        return [4 /*yield*/, Promise.all([
                                prisma.poll.findMany({
                                    where: where,
                                    orderBy: { created_at: "desc" },
                                    skip: (query.page - 1) * query.limit,
                                    take: query.limit,
                                    include: {
                                        _count: { select: { votes: true, opinions: true } },
                                    },
                                }),
                                prisma.poll.count({ where: where }),
                            ])];
                    case 2:
                        _a = _b.sent(), polls = _a[0], total = _a[1];
                        return [2 /*return*/, {
                                polls: polls.map(function (poll) {
                                    var _a;
                                    return ({
                                        id: poll.id,
                                        question: poll.question,
                                        options: poll.options,
                                        category: poll.category,
                                        status: poll.status,
                                        is_commercial: (_a = poll.is_commercial) !== null && _a !== void 0 ? _a : false,
                                        total_votes: poll._count.votes,
                                        total_opinions: poll._count.opinions,
                                        created_at: poll.created_at,
                                    });
                                }),
                                pagination: {
                                    page: query.page,
                                    limit: query.limit,
                                    total: total,
                                    total_pages: Math.ceil(total / query.limit),
                                },
                            }];
                }
            });
        });
    };
    PollsService.prototype.archivePoll = function (pollId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, prisma.poll.update({
                        where: { id: pollId },
                        data: { status: "ARCHIVED", is_active: false },
                    })];
            });
        });
    };
    PollsService.prototype.isElectionBlackoutActive = function (region) {
        return __awaiter(this, void 0, void 0, function () {
            var now, blackout;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = new Date();
                        return [4 /*yield*/, prisma.electionBlackout.findFirst({
                                where: {
                                    active: true,
                                    blackout_starts: { lte: now },
                                    polling_date: { gte: now },
                                    OR: [{ region: region }, { region: "ALL" }],
                                },
                            })];
                    case 1:
                        blackout = _a.sent();
                        return [2 /*return*/, !!blackout];
                }
            });
        });
    };
    PollsService.prototype.calculateEstimatedReach = function (filters) {
        return __awaiter(this, void 0, void 0, function () {
            var where, profileWhere;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                if (!filters || Object.keys(filters).length === 0) {
                    return [2 /*return*/, prisma.user.count({ where: { is_active: true } })];
                }
                where = { is_active: true };
                if ((_a = filters.states) === null || _a === void 0 ? void 0 : _a.length) {
                    where.state = { in: filters.states };
                }
                if ((_b = filters.city_tiers) === null || _b === void 0 ? void 0 : _b.length) {
                    where.city_tier = { in: filters.city_tiers };
                }
                profileWhere = {};
                if ((_c = filters.age_brackets) === null || _c === void 0 ? void 0 : _c.length)
                    profileWhere.age_bracket = { in: filters.age_brackets };
                if ((_d = filters.genders) === null || _d === void 0 ? void 0 : _d.length)
                    profileWhere.gender = { in: filters.genders };
                if ((_e = filters.income_brackets) === null || _e === void 0 ? void 0 : _e.length)
                    profileWhere.income_bracket = { in: filters.income_brackets };
                if ((_f = filters.education) === null || _f === void 0 ? void 0 : _f.length)
                    profileWhere.education = { in: filters.education };
                if ((_g = filters.employment) === null || _g === void 0 ? void 0 : _g.length)
                    profileWhere.employment = { in: filters.employment };
                if ((_h = filters.vehicle_ownership) === null || _h === void 0 ? void 0 : _h.length)
                    profileWhere.vehicle = { in: filters.vehicle_ownership };
                if (Object.keys(profileWhere).length > 0) {
                    return [2 /*return*/, prisma.user.count({
                            where: __assign(__assign({}, where), { profile: __assign({}, profileWhere) }),
                        })];
                }
                return [2 /*return*/, prisma.user.count({ where: where })];
            });
        });
    };
    PollsService.prototype.assignPollToUsers = function (pollId, filters) {
        return __awaiter(this, void 0, void 0, function () {
            var where, profileWhere, query, users, assignments;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        where = { is_active: true };
                        if ((_a = filters === null || filters === void 0 ? void 0 : filters.states) === null || _a === void 0 ? void 0 : _a.length)
                            where.state = { in: filters.states };
                        if ((_b = filters === null || filters === void 0 ? void 0 : filters.city_tiers) === null || _b === void 0 ? void 0 : _b.length)
                            where.city_tier = { in: filters.city_tiers };
                        profileWhere = {};
                        if ((_c = filters === null || filters === void 0 ? void 0 : filters.age_brackets) === null || _c === void 0 ? void 0 : _c.length)
                            profileWhere.age_bracket = { in: filters.age_brackets };
                        if ((_d = filters === null || filters === void 0 ? void 0 : filters.genders) === null || _d === void 0 ? void 0 : _d.length)
                            profileWhere.gender = { in: filters.genders };
                        if ((_e = filters === null || filters === void 0 ? void 0 : filters.income_brackets) === null || _e === void 0 ? void 0 : _e.length)
                            profileWhere.income_bracket = { in: filters.income_brackets };
                        if ((_f = filters === null || filters === void 0 ? void 0 : filters.education) === null || _f === void 0 ? void 0 : _f.length)
                            profileWhere.education = { in: filters.education };
                        if ((_g = filters === null || filters === void 0 ? void 0 : filters.employment) === null || _g === void 0 ? void 0 : _g.length)
                            profileWhere.employment = { in: filters.employment };
                        if ((_h = filters === null || filters === void 0 ? void 0 : filters.vehicle_ownership) === null || _h === void 0 ? void 0 : _h.length)
                            profileWhere.vehicle = { in: filters.vehicle_ownership };
                        query = { where: where };
                        if (Object.keys(profileWhere).length > 0) {
                            query.where.profile = profileWhere;
                        }
                        return [4 /*yield*/, prisma.user.findMany(__assign(__assign({}, query), { select: { id: true } }))];
                    case 1:
                        users = _j.sent();
                        assignments = users.map(function (u) { return ({
                            user_id: u.id,
                            poll_id: pollId,
                        }); });
                        if (!(assignments.length > 0)) return [3 /*break*/, 3];
                        return [4 /*yield*/, prisma.userPollAssignment.createMany({
                                data: assignments,
                                skipDuplicates: true,
                            })];
                    case 2:
                        _j.sent();
                        _j.label = 3;
                    case 3:
                        logger_1.logger.info("Assigned poll ".concat(pollId, " to ").concat(assignments.length, " users"));
                        return [2 /*return*/];
                }
            });
        });
    };
    return PollsService;
}());
exports.PollsService = PollsService;
exports.pollsService = new PollsService();
