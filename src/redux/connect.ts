import { defineReadonlyProperty } from "elmer-common";
import { defineReduxProvider } from "./defineReduxProvider";
import { ReduxController } from "./ReduxController";
import { REDUX_GLOBAL_LISTEN_KEY } from "./ReduxGlobalStateKeys";

export interface IConnectParams {
    mapDispatchToProps: Function;
    mapStateToProps: Function;
}

export const connect = (reduxController: ReduxController, Component: any, mapStateToPropsFn:Function, mapDispatchToPropsFn:Function, getGlobalState:Function, defineGlobalState:Function): void => {
    let stateID = REDUX_GLOBAL_LISTEN_KEY;
    let stateData = getGlobalState(stateID);
    let checkSelector = Component.prototype.selector;
    if(checkSelector !== undefined && checkSelector !== null) {
        if(!stateData) {
            let gState = defineReduxProvider<any,any>(getGlobalState, defineGlobalState);
            stateData = gState.listener;
            gState = null;
        }
        if(!stateData[checkSelector]) {
            defineReadonlyProperty(reduxController.stateWatchs, checkSelector, {
                mapDispatchToProps: mapDispatchToPropsFn,
                mapStateToProps: mapStateToPropsFn
            });
        }
    }
    checkSelector = null;
    stateID = null;
};

export type TypeReduxSaveStorage = "SessionStorage" | "LocalStorage" | "StoragePlugin";
