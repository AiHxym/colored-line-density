/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-20 15:13:53
 * @LastEditTime: 2022-06-23 00:30:07
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
export function computeAllMaximalGroups(lines: Line[], duration: [number, number], range: [number, number], epsilon: number): Trend[] {
    const trends: Trend[] = [];
    const [minX, maxX] = duration;
    const [minY, maxY] = range;
    const [minIndex, maxIndex] = getRangeIndices(lines, duration);

    // scan through the line set to find all maximal ε-connected sets at the start time point
    const legalLines = lines.filter(line => line[minIndex].y >= minY && line[minIndex].y <= maxY && line[maxIndex].y >= minY && line[maxIndex].y <= maxY);
    legalLines.sort((a, b) => a[minIndex].y - b[minIndex].y);
    let lastBreak = 0;
    const epsilonConnectedLineSets = [];
    for (let i = 1; i < legalLines.length; ++i) {
        if (legalLines[i][minIndex].y - legalLines[i - 1][minIndex].y > epsilon) {
            epsilonConnectedLineSets.push(legalLines.slice(lastBreak, i));
            lastBreak = i;
        }
    }
    //console.log(lastBreak);
    epsilonConnectedLineSets.push(legalLines.slice(lastBreak));


    // for all epsilon-connected sets
    for (let epsilonConnectedLineSet of epsilonConnectedLineSets) {
        let minYOfThisLineSet = Math.min(...epsilonConnectedLineSet.map(line => line[minIndex].y));
        let maxYOfThisLineSet = Math.max(...epsilonConnectedLineSet.map(line => line[minIndex].y));

        let isSplited = false;
        for (let indexOfRange = minIndex + 1; indexOfRange <= maxIndex; ++indexOfRange) {
            const splitePositions: number[] = [];

            epsilonConnectedLineSet.sort((a, b) => a[indexOfRange].y - b[indexOfRange].y);

            for (let i = 1; i < epsilonConnectedLineSet.length; ++i) {
                if (epsilonConnectedLineSet[i][indexOfRange].y - epsilonConnectedLineSet[i - 1][indexOfRange].y > epsilon) {
                    splitePositions.push(i);
                }

            }
            let minRealSplitProportion = 1.1;
            let minSplitePosition = -1;
            for (let splitePosition of splitePositions) {
                const realSplitProportion =
                    epsilon *
                    (epsilonConnectedLineSet[splitePosition][indexOfRange - 1].y - epsilonConnectedLineSet[splitePosition - 1][indexOfRange - 1].y)
                    / (epsilonConnectedLineSet[splitePosition][indexOfRange].y - epsilonConnectedLineSet[splitePosition - 1][indexOfRange].y);
                if (realSplitProportion < minRealSplitProportion) {
                    minRealSplitProportion = realSplitProportion;
                    minSplitePosition = splitePosition;
                }
            }
            if (minSplitePosition !== -1) {
                const G: Trend = {
                    support: epsilonConnectedLineSet.length,
                    duration: [minX, epsilonConnectedLineSet[0][indexOfRange - 1].x],
                    range: [minYOfThisLineSet, maxYOfThisLineSet],
                    distribution: epsilonConnectedLineSet.slice()
                }; // G is a maximal group on time-interval [minX , x'].
                trends.push(G);
                trends.push(...computeAllMaximalGroups(epsilonConnectedLineSet.slice(0, minSplitePosition), [epsilonConnectedLineSet[0][indexOfRange].x, maxX], range, epsilon))
                trends.push(...computeAllMaximalGroups(epsilonConnectedLineSet.slice(minSplitePosition), [epsilonConnectedLineSet[0][indexOfRange].x, maxX], range, epsilon))
                isSplited = true;
                break;
            }
            let localMinYOfThisLineSet = Math.min(...epsilonConnectedLineSet.map(line => line[indexOfRange].y));
            let localMaxYOfThisLineSet = Math.max(...epsilonConnectedLineSet.map(line => line[indexOfRange].y));
            if (localMinYOfThisLineSet < minYOfThisLineSet) {
                minYOfThisLineSet = localMinYOfThisLineSet;
            }
            if (localMaxYOfThisLineSet > maxYOfThisLineSet) {
                maxYOfThisLineSet = localMaxYOfThisLineSet;
            }
        }
        if (!isSplited) {
            const G: Trend = {
                support: epsilonConnectedLineSet.length,
                duration: [minX, maxX],
                range: [minYOfThisLineSet, maxYOfThisLineSet],
                distribution: epsilonConnectedLineSet.slice()
            }; // G is a maximal group on time-interval [minX , x'].
            trends.push(G);
        }

    }
    return trends;
}

