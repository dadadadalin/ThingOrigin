interface jointsParams {
  axis: "x" | "y" | "z";
  modelName: string;
  animateType: string;
  rotateUnit: string;
  reverse?: number;
  correct?: number;
  dataUrl?: string;
  simulateRange?: number[];
}

interface jointDataParams {
  joint1: number;
  joint2: number;
  joint3: number;
  joint4: number;
  joint5: number;
  joint6: number;
}
