import { REDUX_GLOBAL_LISTEN_KEY, REDUX_GLOBAL_STATE_KEY } from "./ReduxGlobalStateKeys";

type TypeReduxGlobalState<TypeStateData, TypeListenerData> = {
    state: {[P in keyof TypeStateData]: any};
    listener: {[P in keyof TypeListenerData]:Function};
};
/**
 * 初始化全局变量保存Redux管理数据
 * @param getGlobalState 获取全局对象用于保存数据
 * @param defineGlobalState 定义全局对象保存数据，当前方法会调用几次defineGlobalState传入key初始化数据结构
 */
export const defineReduxProvider = <TypeStateData,TypeListeners>(getGlobalState:Function, defineGlobalState: Function): TypeReduxGlobalState<TypeStateData, TypeListeners> => {
    let dataID = REDUX_GLOBAL_STATE_KEY;
    let listenerID = REDUX_GLOBAL_LISTEN_KEY;
    const reduxState:TypeReduxGlobalState<TypeStateData, TypeListeners> = {
        listener: null,
        state: null
    };
    if(!getGlobalState(dataID)) {
        reduxState.listener = <any>{};
        reduxState.state = <any>{};
        defineGlobalState(dataID, reduxState.state); // 保存单纯的state数据
        defineGlobalState(listenerID, reduxState.listener); // 保存subscribe挂载对象，在数据变化时触发组件的Change事件
        dataID = null;
        listenerID = null;
    } else {
        reduxState.state = getGlobalState(dataID);
        reduxState.listener = getGlobalState(listenerID);
    }
    return reduxState;
};
