/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-20 15:13:53
 * @LastEditTime: 2022-06-20 19:45:13
 * @LastEditors: Yumeng Xue
 * @Description: sweep line algorithm for trend deterction
 * @FilePath: /trend-mixer/src/core/trend-detector.ts
 */
import { Line } from "./defs/line";
import { Trend } from "./defs/trend";

function computeAllMaximalGroups(lines: Line[], duration: [number, number]): Trend[] {
    const trends: Trend[] = [];
    const [minX, maxX] = duration;
    const [minY, maxY] = [lines[0][0].y, lines[0][lines[0].length - 1].y];
    return trends;
}

/**
 * @param lines: lines to be detected
 * @param support: support of the trend
 * @param duration: duration of the trend
 * @param range: range of the trend
 * @returns: detected trends
 * @description: sweep line algorithm for trend deterction
 */
function trendDetect(lines: Line[], duration: [number, number], range: [number, number]): Trend[] {
    const trends: Trend[] = [];
    const [minX, maxX] = duration;
    const [minY, maxY] = range;

    return trends;
}

