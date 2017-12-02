import {ExponentialBackoff} from "../src/ts-retry";
import {expect} from "chai";

describe("executor", () => {

    describe("ExponentialBackoff", () => {

        it("should not retry when the command is successful the first time using the default config", () => {
            const expected = {
                result: "success!",
                succeeded: true,
                attempts: 1
            };
            return new ExponentialBackoff<string>().execute(() => Promise.resolve(expected.result))
                .then(result => expect(result).to.contain(expected));
        });

        it("should retry on error and return successfully using the default config", () => {
            const expected = {
                result: "success!",
                succeeded: true,
                attempts: 2
            };
            let invoked = 0;
            return new ExponentialBackoff<string>().execute(() => {
                invoked += 1;
                if (invoked <= 1)
                    throw new Error('Error!!');
                return Promise.resolve(expected.result);
            }).then(result => expect(result).to.contain(expected));
        });

        it("should retry no more than the max number of times when errors occur using the default config", () => {
            const error = new Error();
            const expected = {
                result: error,
                succeeded: false,
                attempts: 3
            };
            return new ExponentialBackoff<string>().execute(() => Promise.reject(error))
                .then(result => expect(result).to.contain(expected));
        });

    });

});