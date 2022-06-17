/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 14:12:47
 * @LastEditTime: 2022-06-17 17:00:41
 * @LastEditors: Yumeng Xue
 * @Description: some utils for the program
 * @FilePath: /trend-mixer/src/core/utils.ts
 */

import { Line } from './defs/line';

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function binarySearch(line: Line, x: number): number {
    let [min, max] = [0, line.length - 1];
    let mid = Math.floor((min + max) / 2);
    while (min < max) {
        if (line[mid].x < x) {
            min = mid + 1;
        } else {
            max = mid;
        }
        mid = Math.floor((min + max) / 2);
    }
    return mid;
}

function getYValue(line: Line, x: number): number {
    const [min, max] = [line[0].x, line[line.length - 1].x];
    if (x < min || x > max) {
        throw new Error(`x value ${x} is out of range [${min}, ${max}]`);
    }
    const index = binarySearch(line, x);
    const [prevX, prevY] = [line[index - 1].x, line[index - 1].y];
    const [nextX, nextY] = [line[index].x, line[index].y];
    return prevY + (nextY - prevY) * (x - prevX) / (nextX - prevX);
}

function resampleLine(line: Line, range: [number, number], sampleNum: number): Line {
    const [min, max] = range;
    const resampledLine: Line = [];
    for (let i = 0; i < sampleNum; ++i) {
        const x = min + i * (max - min) / (sampleNum - 1);
        resampledLine.push({ x, y: getYValue(line, x) });
    }
    return resampledLine;
}

function resampleLines(lines: Line[], range: [number, number], sampleNum: number): Line[] {
    const resampledLines: Line[] = [];
    for (let i = 0; i < lines.length; ++i) {
        resampledLines.push(resampleLine(lines[i], range, sampleNum));
    }
    return resampledLines;
}

function calculateAllLineBandDepth(lines: Line[], ensembleNum: number): number[] {
    const bandDepths: number[] = [];
    for (let i = 0; i < lines.length; ++i) {
        if (lines[i].length <= ensembleNum) {
            throw new Error(`Ensemble number ${ensembleNum} is too large for line ${i}`);
        }
        const counter = new Array(lines[i].length).fill({ low: Infinity, high: -Infinity });
        for (let ensembleIndex = 0; ensembleIndex < ensembleNum; ++ensembleIndex) {
            const lineNum = randomInt(0, lines[i].length - 1);
            for (let j = 0; j < lines[lineNum].length; ++j) {
                if (lines[lineNum][j].y < counter[j].low) {
                    counter[j].low = lines[lineNum][j].y;
                }
                if (lines[lineNum][j].y > counter[j].high) {
                    counter[j].high = lines[lineNum][j].y;
                }
            }
        }
        let bandDepth = 0;
        for (let j = 0; j < counter.length; ++j) {
            if (lines[i][j].y >= counter[j].low && lines[i][j].y <= counter[j].high) {
                ++bandDepth;
            }
        }
        bandDepths.push(bandDepth / counter.length);
    }
    return bandDepths;
}