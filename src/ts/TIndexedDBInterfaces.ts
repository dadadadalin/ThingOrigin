interface IDBParams {
    id: number;
    name: string;
    type: string;
    url: string;
    custom?: string;
    position?: number[];
    rotation?: number[];
    scale?: number[];
    model?: Blob;
}

interface modelResultParams {
    url?: string;
    saved: boolean;
}
