interface jointsParams {
    name: string;
    axis: string;
    reverse: number;
}

interface jointDataParams {
    joint1: number;
    joint2: number;
    joint3: number;
    joint4: number;
    joint5: number;
    joint6: number;
}

interface twinJointsParams extends jointsParams {
    time: number;
    preData: number;
    curData: number;
}
