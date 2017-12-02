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
class CommandResult {
    constructor(command, result, succeeded, attempts) {
        this.command = command;
        this.result = result;
        this.succeeded = succeeded;
        this.attempts = attempts;
    }
    get successful() {
        return this.success;
    }
    get success() {
        if (!this.successful)
            throw new Error(`Command was not successful.`);
        if (this.result instanceof Error)
            throw this.result;
        return this.result;
    }
}
exports.CommandResult = CommandResult;
exports.AnyErrorRetryDecider = (e, r) => r === null;
class ExponentialBackoffExecutorFactory {
    constructor(config) {
        this.config = config;
        if (!config)
            throw new Error(`config is required but missing`);
    }
    create() {
        return new ExponentialBackoff(this.config);
    }
    executor() {
        return (command) => {
            return this.create().execute(command);
        };
    }
}
exports.ExponentialBackoffExecutorFactory = ExponentialBackoffExecutorFactory;
class DefaultExponentialBackoffConfig {
    constructor(maxAttempts = 3, initialRetryDelay = 200, shouldRetry = exports.AnyErrorRetryDecider) {
        this.maxAttempts = maxAttempts;
        this.initialRetryDelay = initialRetryDelay;
        this.shouldRetry = shouldRetry;
    }
}
exports.DefaultExponentialBackoffConfig = DefaultExponentialBackoffConfig;
class ExponentialBackoff {
    constructor(config = new DefaultExponentialBackoffConfig()) {
        this.config = config;
        this.giveUp = false;
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
    recordAttempt() {
        this.attempt += 1;
        if (this.attempt == this.config.maxAttempts)
            this.giveUp = true;
    }
    complete(command, result) {
        return new CommandResult(command, result, !this.giveUp, this.attempt);
    }
    backoff() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(res => setTimeout(() => res(null), this.calcBackoff()));
        });
    }
    calcBackoff() {
        if (this.attempt === 1)
            return this.config.initialRetryDelay;
        return Math.pow(2, this.attempt - 1) * this.config.initialRetryDelay;
    }
    execute(command) {
        return __awaiter(this, void 0, void 0, function* () {
            const exec = () => __awaiter(this, void 0, void 0, function* () {
                this.recordAttempt();
                try {
                    const result = yield command();
                    if (this.config.shouldRetry(null, result) && !this.giveUp) {
                        yield this.backoff();
                        return yield exec();
                    }
                    return this.complete(command, result);
                }
                catch (error) {
                    if (this.config.shouldRetry(error, null) && !this.giveUp) {
                        yield this.backoff();
                        return yield exec();
                    }
                    return this.complete(command, error);
                }
            });
            return yield exec();
        });
    }
}
exports.ExponentialBackoff = ExponentialBackoff;
//# sourceMappingURL=ts-retry.js.map