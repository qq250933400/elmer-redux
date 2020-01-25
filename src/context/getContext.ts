import { StaticCommon } from "elmer-common";
export type TypeDefineContextRules = {
    description?: string;
    rule: Function;
};
export const getContext = <T>(target: any, defineRules:{[P in keyof T]: TypeDefineContextRules}, saveAttrKey?: string):{[P in keyof T]: any} => {
    const attrKey = !StaticCommon.isEmpty(saveAttrKey) ? saveAttrKey : "contextStore";
    const contextData = target[attrKey] || {};
    const contextResult:any = {};
    if(defineRules) {
        // tslint:disable-next-line: forin
        for(const key in defineRules) {
            const dRule = defineRules[key];
            const dData = StaticCommon.getValue(contextData, key);
            if(dData !== undefined) {
                contextResult[key] = dData;
            }
            if(typeof dRule.rule === "function") {
                if(!dRule.rule(dData)) {
                    // tslint:disable-next-line: no-console
                    console.error(`${key}定义类型和ContextStore数据不匹配!`);
                }
            }
        }
    }
    return contextResult;
};
