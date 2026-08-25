/**
 * @module
 * @mergeModuleWith <project>
 */

/**
 * @group Interfaces
 */
export interface accessResult {
    info: any;
    modelUrl?: string;
}

/**
 * @group Interfaces
 */
export interface accessInsetResult {
    saved: boolean;
    inserted: boolean;
    modelUrl?: string;
}
