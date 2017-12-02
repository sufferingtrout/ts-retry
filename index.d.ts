export declare type RetryDecider<T> = (error: Error, response: T) => boolean;
export declare type Command<T> = () => Promise<T>;
export declare type ExecutorFunction<T> = (command: Command<T>) => Promise<CommandResult<T>>;
export declare class CommandResult<T> {
    readonly command: Command<T>;
    readonly result: T | Error;
    readonly succeeded: boolean;
    readonly attempts: any;
    constructor(command: Command<T>, result: T | Error, succeeded: boolean, attempts: any);
    readonly successful: boolean;
    readonly success: T;
}
export interface Executor<T> {
    execute(command: Command<T>): Promise<CommandResult<T>>;
}
export declare const AnyErrorRetryDecider: RetryDecider<any>;
export declare class ExponentialBackoffExecutorFactory<T> {
    private readonly config;
    constructor(config: ExponentialBackoffConfig<T>);
    create(): ExponentialBackoff<T>;
    executor(): ExecutorFunction<T>;
}
export interface ExponentialBackoffConfig<T> {
    maxAttempts: number;
    initialRetryDelay: number;
    shouldRetry: RetryDecider<T>;
}
export declare class DefaultExponentialBackoffConfig<T> implements ExponentialBackoffConfig<T> {
    readonly maxAttempts: number;
    readonly initialRetryDelay: number;
    readonly shouldRetry: RetryDecider<any>;
    constructor(maxAttempts?: number, initialRetryDelay?: number, shouldRetry?: RetryDecider<any>);
}
export declare class ExponentialBackoff<T> implements Executor<T> {
    private readonly config;
    private success;
    private attempt;
    constructor(config?: ExponentialBackoffConfig<T>);
    private complete(command, result);
    private backoff();
    private calcBackoff();
    private recordAttempt();
    private succeeded;
    private readonly attemptsRemain;
    execute(command: Command<T>): Promise<CommandResult<T>>;
}
