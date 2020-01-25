import { ReduxController } from "./ReduxController";
import { REDUX_REDUCER_DEFINE_STATE_KEY } from "./ReduxGlobalStateKeys";

export type TypeReducerAction = {
    data: any;
    type: string;
};

export type TypeReducerCallback = (state:any, action?:TypeReducerAction) => {};

export const createReducer = (getGlobalState: Function, defineGlobalState:Function, nodeKey:string, reducer:TypeReducerCallback) => {
    let defineReducerObject = {};
    if(!getGlobalState(REDUX_REDUCER_DEFINE_STATE_KEY)) {
        defineGlobalState(REDUX_REDUCER_DEFINE_STATE_KEY, defineReducerObject);
    } else {
        defineReducerObject = getGlobalState(REDUX_REDUCER_DEFINE_STATE_KEY);
    }
    defineReducerObject[nodeKey] = reducer;
};

/**
 * This function already use in reduxController, don't need user call it agin
 * @param constroller [ReduxController]
 */
export const attachReducerToController = (controller:ReduxController): void => {
    const reducerObj = controller.getGlobalState(REDUX_REDUCER_DEFINE_STATE_KEY);
    if(reducerObj) {
        Object.keys(reducerObj).map((nodeKey:string) => {
            controller.setValue(controller.reducers, nodeKey, reducerObj[nodeKey]);
        });
    }
};

export const defineStateOperateAction = (controller:ReduxController, getGlobalState:Function, defineGlobalState:Function): void => {
    if(controller) {
        controller.getGlobalState = getGlobalState;
        controller.defineGlobalState = defineGlobalState;
    }
};

export const defineReducer = (controller:ReduxController, nodeKey:string, reducer:TypeReducerCallback) => {
    createReducer(controller.getGlobalState, controller.defineGlobalState, nodeKey, reducer);
};
