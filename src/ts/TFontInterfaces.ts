/**
 * @module
 * @mergeModuleWith <project>
 */

/** 字体参数 */
/**
 * @group Interfaces
 */
export interface fontParams {
    /** 字体访问链接 */
    fontUrl: string;
    /** 字体名称 */
    fontName: string;
    /** 缓存 */
    indexedDB: {
        /** 是否缓存字体 */
        active: boolean;
        /** 缓存字体的id */
        id: number;
    };
}
