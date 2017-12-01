import * as ts from "typescript/lib/tsserverlibrary";
import Err = ts.server.Msg.Err;
export type RetryDecider<T> = (error: Error, response?: T) => boolean;
export type Command<T> = () => Promise<T>;
export type ExecutorFunction<T> = (command: Command<T>) => Promise<CommandResult<T>>;

export interface Executor<T> {
    execute(command: Command<T>): Promise<CommandResult<T>>;
}

export const AnyErrorRetryDecider: RetryDecider<any> = (_, e) => e === undefined;

class CommandResult<T> {
    constructor(readonly command: Command<T>, readonly result: T | Error, readonly succeeded: boolean, readonly attempts) {
    }

    get successful() {
        return this.success;
    }

    get success(): T {
        if (this.result instanceof Error)
            throw this.result;
        return this.result as T;
    }
}

export class ExponentialBackoffExecutorFactory<T> {
    constructor(private readonly config: ExponentialBackoffConfig<T>) {
        if (!config) throw new Error(`config is required but missing`);
    }

    public create(): ExponentialBackoff<T> {
        return new ExponentialBackoff<T>(this.config);
    }

    public executor(): ExecutorFunction<T> {
        return (command: Command<T>) => {
            return this.create().execute(command);
        }
    }
}

export interface ExponentialBackoffConfig<T> {
    maxAttempts: number;
    initialRetryDelay: number;
    shouldRetry: RetryDecider<T>;
}

export class DefaultExponentialBackoffConfig<T> implements ExponentialBackoffConfig<T> {
    constructor(public readonly maxAttempts: number = 3,
                public readonly initialRetryDelay = 200,
                public readonly shouldRetry = AnyErrorRetryDecider) {
    }
}

export class ExponentialBackoff<T> implements Executor<T> {
    private giveUp = false;
    private attempt = 0;

    constructor(private readonly config: ExponentialBackoffConfig<T> = new DefaultExponentialBackoffConfig<any>()) {
        if (!config) throw new Error('config is missing but required');
        if (!(config.maxAttempts > 0)) throw new Error('maxAttempts is required and must be > 0');
        if (!(config.initialRetryDelay >= 50)) throw new Error('initialDelay is required and must be >= 50');
        if (!config.shouldRetry) throw new Error('shouldRetry is missing by required');
    }

    private recordAttempt() {
        this.attempt += 1;
        if (this.attempt == this.config.maxAttempts)
            this.giveUp = true;
    }

    private complete(command: Command<T>, result: T | Error): CommandResult<T> {
        return new CommandResult(command, result, !this.giveUp, this.attempt);
    }

    private async backoff(): Promise<void> {
        return new Promise<void>(res => setTimeout(() => res(null), this.calcBackoff()));
    }

    private calcBackoff() {
        if (this.attempt === 1)
            return this.config.initialRetryDelay;
        return Math.pow(2, this.attempt - 1) * this.config.initialRetryDelay;
    }

    public async execute(command: Command<T>): Promise<CommandResult<T>> {
        const exec: () => Promise<CommandResult<T>> = async () => {
            this.recordAttempt();
            try {
                const result = await command();
                if (this.config.shouldRetry(null, result) && !this.giveUp) {
                    await this.backoff();
                    return await exec();
                }
                return this.complete(command, result);
            } catch (error) {
                if (this.config.shouldRetry(error) && !this.giveUp) {
                    await this.backoff();
                    return await exec();
                }
                return this.complete(command, error);
            }
        };
        return await exec();
    }
}