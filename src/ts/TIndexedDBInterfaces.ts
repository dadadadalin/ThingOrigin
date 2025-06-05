interface modelResultParams {
  saved: boolean;
  url?: string;
  id?: number;
  scale?: number[];
  modelType?: string;
  name?: string;
  position?: number[];
  rotation?: number[];
  userData?: any;
  modelName?: string;
  modelSize?: string;
}

interface accessResult {
  info: any;
  modelUrl?: string;
}

interface accessInsetResult {
  saved: boolean;
  inserted: boolean;
  modelUrl?: string;
}
