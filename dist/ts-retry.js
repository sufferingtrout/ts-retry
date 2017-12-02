"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
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
var CommandResult = (function () {
    function CommandResult(command, result, succeeded, attempts) {
        this.command = command;
        this.result = result;
        this.succeeded = succeeded;
        this.attempts = attempts;
    }
    Object.defineProperty(CommandResult.prototype, "successful", {
        get: function () {
            return this.succeeded;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CommandResult.prototype, "success", {
        get: function () {
            if (!this.successful)
                throw new Error("Command was not successful.");
            if (this.result instanceof Error)
                throw this.result;
            return this.result;
        },
        enumerable: true,
        configurable: true
    });
    return CommandResult;
}());
exports.CommandResult = CommandResult;
exports.AnyErrorRetryDecider = function (e, r) { return r === null; };
var ExponentialBackoffExecutorFactory = (function () {
    function ExponentialBackoffExecutorFactory(config) {
        this.config = config;
        if (!config)
            throw new Error("config is required but missing");
    }
    ExponentialBackoffExecutorFactory.prototype.create = function () {
        return new ExponentialBackoff(this.config);
    };
    ExponentialBackoffExecutorFactory.prototype.executor = function () {
        var _this = this;
        return function (command) {
            return _this.create().execute(command);
        };
    };
    return ExponentialBackoffExecutorFactory;
}());
exports.ExponentialBackoffExecutorFactory = ExponentialBackoffExecutorFactory;
var DefaultExponentialBackoffConfig = (function () {
    function DefaultExponentialBackoffConfig(maxAttempts, initialRetryDelay, shouldRetry) {
        if (maxAttempts === void 0) { maxAttempts = 3; }
        if (initialRetryDelay === void 0) { initialRetryDelay = 200; }
        if (shouldRetry === void 0) { shouldRetry = exports.AnyErrorRetryDecider; }
        this.maxAttempts = maxAttempts;
        this.initialRetryDelay = initialRetryDelay;
        this.shouldRetry = shouldRetry;
    }
    return DefaultExponentialBackoffConfig;
}());
exports.DefaultExponentialBackoffConfig = DefaultExponentialBackoffConfig;
var ExponentialBackoff = (function () {
    function ExponentialBackoff(config) {
        if (config === void 0) { config = new DefaultExponentialBackoffConfig(); }
        this.config = config;
        this.success = false;
        this.attempt = 0;
        if (!config)
            throw new Error('config is missing but required');
        if (!(config.maxAttempts > 0))
            throw new Error('maxAttempts is required and must be > 0');
        if (!(config.initialRetryDelay >= 50))
            throw new Error('initialDelay is required and must be >= 50');
        if (!config.shouldRetry)
            throw new Error('shouldRetry is missing by required');
    }
    ExponentialBackoff.prototype.complete = function (command, result) {
        return new CommandResult(command, result, this.succeeded, this.attempt);
    };
    ExponentialBackoff.prototype.backoff = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2, new Promise(function (res) { return setTimeout(function () { return res(null); }, _this.calcBackoff()); })];
            });
        });
    };
    ExponentialBackoff.prototype.calcBackoff = function () {
        if (this.attempt === 1)
            return this.config.initialRetryDelay;
        return Math.pow(2, this.attempt - 1) * this.config.initialRetryDelay;
    };
    ExponentialBackoff.prototype.recordAttempt = function () { this.attempt += 1; };
    Object.defineProperty(ExponentialBackoff.prototype, "succeeded", {
        get: function () { return this.success; },
        set: function (success) { this.success = success; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ExponentialBackoff.prototype, "attemptsRemain", {
        get: function () { return this.attempt < this.config.maxAttempts; },
        enumerable: true,
        configurable: true
    });
    ExponentialBackoff.prototype.execute = function (command) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var exec, retry;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        exec = function () { return __awaiter(_this, void 0, void 0, function () {
                            var result, error_1;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4, command()];
                                    case 1:
                                        result = _a.sent();
                                        this.recordAttempt();
                                        this.succeeded = !this.config.shouldRetry(null, result);
                                        if (!this.succeeded && this.attemptsRemain)
                                            return [2, retry()];
                                        return [2, this.complete(command, result)];
                                    case 2:
                                        error_1 = _a.sent();
                                        this.recordAttempt();
                                        this.succeeded = !this.config.shouldRetry(error_1, null);
                                        if (!this.succeeded && this.attemptsRemain)
                                            return [2, retry()];
                                        return [2, this.complete(command, error_1)];
                                    case 3: return [2];
                                }
                            });
                        }); };
                        retry = function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4, this.backoff()];
                                    case 1:
                                        _a.sent();
                                        return [4, exec()];
                                    case 2: return [2, _a.sent()];
                                }
                            });
                        }); };
                        return [4, exec()];
                    case 1: return [2, _a.sent()];
                }
            });
        });
    };
    return ExponentialBackoff;
}());
exports.ExponentialBackoff = ExponentialBackoff;
//# sourceMappingURL=ts-retry.js.map