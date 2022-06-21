/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-20 15:13:53
 * @LastEditTime: 2022-06-21 23:58:11
 * @LastEditors: Yumeng Xue
 * @Description: sweep line algorithm for trend deterction
 * @FilePath: /trend-mixer/src/core/trend-detector.ts
 */
import { Line } from "./defs/line";
import { Trend } from "./defs/trend";

function getRangeIndices(lines: Line[], duration: [number, number]): [number, number] { // suppose the lines are aligned
    const [minX, maxX] = duration;
    let minIndex = -1, maxIndex = -1;
    for (let i = 0; i < lines[0].length; ++i) {
        if (lines[0][i].x >= minX) {
            minIndex = i;
            break;
        }
    }
    for (let i = lines[0].length - 1; i >= 0; --i) {
        if (lines[0][i].x <= maxX) {
            maxIndex = i;
            break;
        }
    }

    if (minIndex === -1 || maxIndex === -1) {
        throw new Error(`cannot find range indices for duration [${minX}, ${maxX}]`);
    }

    return [minIndex, maxIndex];
}


/**
 * @param lines: lines to be detected
 * @param support: support of the trend
 * @param duration: duration of the trend
 * @param range: range of the trend
 * @returns: detected trends
 * @description: sweep line algorithm for trend deterction
 */
function computeAllMaximalGroups(lines: Line[], duration: [number, number], range: [number, number], epsilon: number): Trend[] {
    const trends: Trend[] = [];
    const [minX, maxX] = duration;
    const [minY, maxY] = range;
    const [minIndex, maxIndex] = getRangeIndices(lines, duration);

    // scan through the line set to find all maximal ε-connected sets at the start time point
    const legalLines = lines.filter(line => line[minIndex].y >= minY && line[maxIndex].y <= maxY);
    legalLines.sort((a, b) => a[0].y - b[0].y);
    let lastBreak = 0;
    const epsilonConnectedLineSets = [];
    for (let i = 1; i < lines.length; ++i) {
        const line = lines[i];
        if (line[i].y - line[i - 1].y > epsilon) {
            epsilonConnectedLineSets.push(line.slice(lastBreak, i));
            lastBreak = i;
        }
    }
    // for all epsilon-connected sets
    for (let epsilonConnectedLineSet of epsilonConnectedLineSets) {
        for (let i = 0; i < epsilonConnectedLineSet.length; ++i) {

        }
    }
    return trends;
}

