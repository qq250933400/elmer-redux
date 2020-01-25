import { assert } from "chai";
import "mocha";
import { defineContext } from "../../src/context/defineContext";
import { getContext } from "../../src/context/getContext";

describe("getContext result test", () => {
    const a = {};
    defineContext(a, {
        contextData: {
            demo: "aaaa"
        }
    });
    it("getContext by rules", () => {
        const dRules = {
            demo: {
                description: "define element",
                rule: (val) => {
                    return typeof val === "object";
                }
            }
        };
        const r = getContext(a, dRules);
        assert.equal(r.demo, "aaaa");
    });
});
