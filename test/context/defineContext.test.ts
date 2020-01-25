// import assets from "asset";
import { assert } from "chai";
import "mocha";
import { defineContext } from "../../src/context/defineContext";

describe("defineContext action test", () => {
    it("define on empty object", () => {
        const a:any = {};
        defineContext(a, {
            contextData: {
                demo: {
                    title: "aaaa"
                }
            },
            saveAttrKey: "contextStore"
        });
        assert.equal(typeof a.contextStore, "object");
        assert.equal(a.contextStore.demo.title, "aaaa");
    });
    it("define on exits object", () => {
        const b:any = {
            contextStore: {
                demo: "demo test"
            }
        };
        defineContext(b, {
            contextData: {
                demo: {
                    title: "aaaa"
                }
            }
        });
        assert.equal(b.contextStore.demo, "demo test");
    });
});
