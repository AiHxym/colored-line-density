/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:56:42
 * @LastEditTime: 2022-06-17 14:12:10
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/defs/line.ts
 */

type Line = { x: number, y: number, z?: number }[];  // line is a set of adjacent points

type Importance = number;                         // importance is now defined as a number

type ImportamceLine = { // importance line is a line with local importance and global importance
    line: Line,
    localImportance: Importance[],
    globalImportance: Importance
}

export type { Line, Importance, ImportamceLine };