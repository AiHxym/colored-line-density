/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:56:42
 * @LastEditTime: 2022-06-22 21:16:44
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/defs/line.ts
 */

export type Line = { x: number, y: number | null, z?: number }[];  // line is a set of adjacent points

export type Importance = number;                         // importance is now defined as a number

export interface ImportamceLine { // importance line is a line with local importance and global importance
    line: Line,
    localImportance: Importance[],
    globalImportance: Importance
}
