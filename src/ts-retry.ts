/**
 * Used to decide whether or not a command execution should be retried.
 * The function will be called with the "error" param set and "response" param set to null if an Error occurred while executing the command.
 * The function will be called with the "response" param set and the "error" param set to null af the command completed with a response and no Error
 */
export type RetryDecider<T> = (error: Error, response: T) => boolean;

/**
 * The command to execute, returning a successfully completed Promise of the given type
 * or a rejected Promise
 */
export type Command<T> = () => Promise<T>;

/**
 * Function definition for execution of the command
 */
export type ExecutorFunction<T> = (command: Command<T>) => Promise<CommandResult<T>>;

/**
 * The result of an executed (and possibly retried) command. It provides access
 * to the orignal command, the completion result or Error, whether or not the command
 * was able to complete (did not give up due to retry attempts), and how many attempts
 * it took to complete the command.
 */
export class CommandResult<T> {
    constructor(readonly command: Command<T>, readonly result: T | Error, readonly succeeded: boolean, readonly attempts) {
    }

    /**
     * Whether or not the command completed (with success or Error) in fewer than the maximum allowable retries
     * @returns {T}
     */
    get successful() {
        return this.succeeded;
    }

    /**
     * Assuming the command completed successful, returns the command result (either an instance of type T or Error)
     * @returns {T}
     */
    get success(): T {
        if (!this.successful) throw new Error(`Command was not successful.`);

        if (this.result instanceof Error)
            throw this.result;

        return this.result as T;
    }
}

export interface Executor<T> {
    execute(command: Command<T>): Promise<CommandResult<T>>;
}

/**
 * A Simple RetryDecider implementation that decides to retry a command if any Error occurs
 * @param e the Error
 * @param r the instance result
 * @constructor
 */
export const AnyErrorRetryDecider: RetryDecider<any> = (e, r) => r === null;

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
                if (this.config.shouldRetry(error, null) && !this.giveUp) {
                    await this.backoff();
                    return await exec();
                }
                return this.complete(command, error);
            }
        };
        return await exec();
    }
}