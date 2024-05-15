interface IDBParams {
  id: number;
  name: string;
  type: string;
  url: string;
  userData?: string;
  position?: number[];
  rotation?: number[];
  scale?: number[];
  model?: Blob;
}

interface modelResultParams {
  saved: boolean;
  url?: string;
  scale?: number[];
  type?: string;
  name?: string;
  position?: number[];
  rotation?: number[];
  userData?: any;
  modelName?: string;
  modelSize?: string;
  loadType?: string;
}
