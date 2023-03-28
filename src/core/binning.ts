/*
 * @Author: Yumeng Xue
 * @Date: 2022-07-28 15:56:47
 * @LastEditTime: 2023-03-28 14:28:13
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/binning.ts
 */
import { TypedFastBitSet } from "typedfastbitset";
type MyTypedFastBitSet = TypedFastBitSet & { sizeStatic?: number };
interface BinConfig {
    /**
     * The start of the range.
     */
    start: number;
    /**
     * The end of the range.
     */
    stop: number;
    /**
     * The size of bin steps.
     */
    step: number;
}

export type BinningMap = MyTypedFastBitSet[][];

export function binning(lines: { times?: number[]; xValues: number[]; yValues: number[] }[], binX: BinConfig, binY: BinConfig) {

    const bins: BinningMap =
        new Array((binX.stop - binX.start) / binX.step)
            .fill(0)
            .map(() => new Array((binY.stop - binY.start) / binY.step).fill(0).map(() => new TypedFastBitSet()));



    if (lines.length > 0 && lines[0].times) { // binning for 2D trajectory
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index] as { xValues: number[]; yValues: number[] };
            for (let i = 1; i < line.xValues.length; i++) {
                let x0 = line.xValues[i - 1];
                let x1 = line.xValues[i];
                let y0 = line.yValues[i - 1];
                let y1 = line.yValues[i];
                if (x0 > x1) {
                    x1 = line.xValues[i - 1];
                    x0 = line.xValues[i];
                    y1 = line.yValues[i - 1];
                    y0 = line.yValues[i];
                }
                let interX = [x0];
                let interY = [y0];
                if (x1 !== x0) {
                    const k = (y1 - y0) / (x1 - x0);
                    for (let x = Math.floor(x0 / binX.step) * binX.step + binX.step;
                        x < Math.floor(x1 / binX.step) * binX.step + binX.step; x += binX.step) {
                        interX.push(x);
                        interY.push(y0 + (x - x0) * k);
                    }
                }
                interX.push(x1);
                interY.push(y1);
                for (let j = 0; j < interX.length - 1; j++) {
                    const x = Math.min(Math.max(Math.floor(interX[j] / binX.step), 0),
                        Math.floor((binX.stop - binX.start) / binX.step) - 1);
                    const yStart = Math.floor(interY[j] / binY.step);
                    const yEnd = Math.floor(interY[j + 1] / binY.step);
                    for (let y = Math.max(Math.min(yStart, yEnd), 0);
                        y < Math.min(Math.max(yStart, yEnd) + 1, Math.floor((binY.stop - binY.start) / binY.step)); y++) {
                        bins[x][y].add(index);
                    }
                }
            }
        }
    } else if (lines.length > 0) { // binning for 1D trajectory
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index] as { xValues: number[]; yValues: number[] };
            for (let i = 1; i < line.xValues.length; i++) {
                let t0 = line.xValues[i - 1];
                let t1 = line.xValues[i];
                let y0 = line.yValues[i - 1];
                let y1 = line.yValues[i];
                let interT = [t0];
                let interY = [y0];
                if (t1 !== t0) {
                    const k = (y1 - y0) / (t1 - t0);
                    for (let t = Math.floor(t0 / binX.step) * binX.step + binX.step;
                        t < Math.floor(t1 / binX.step) * binX.step + binX.step; t += binX.step) {
                        interT.push(t);
                        interY.push(y0 + (t - t0) * k);
                    }
                }
                interT.push(t1);
                interY.push(y1);
                for (let j = 0; j < interT.length - 1; j++) {
                    const x = Math.min(Math.max(Math.floor(interT[j] / binX.step), 0),
                        Math.floor((binX.stop - binX.start) / binX.step) - 1);
                    const yStart = Math.floor(interY[j] / binY.step);
                    const yEnd = Math.floor(interY[j + 1] / binY.step);
                    for (let y = Math.max(Math.min(yStart, yEnd), 0);
                        y < Math.min(Math.max(yStart, yEnd) + 1, Math.floor((binY.stop - binY.start) / binY.step)); y++) {
                        bins[x][y].add(index);
                    }
                }
            }
        }
    }

    for (let x = 0; x < bins.length; x++) {
        for (let y = 0; y < bins[x].length; y++) {
            bins[x][y].sizeStatic = bins[x][y].size();
        }
    }

    return bins;
}

export function normalizeData(lines: { x: number, y: number }[][], normalize: boolean, scaling_x: [number, number], scaling_y: [number, number]): { xValues: number[]; yValues: number[] }[] {
    const xValues = lines.map(line => line.map(p => p.x));
    const yValues = lines.map(line => line.map(p => p.y));
    const xMax = Math.max(...xValues.map(x => Math.max(...x)));
    const xMin = Math.min(...xValues.map(x => Math.min(...x)));
    const yMax = Math.max(...yValues.map(y => Math.max(...y)));
    const yMin = Math.min(...yValues.map(y => Math.min(...y)));
    const xScale = 1 / (xMax - xMin);
    const yScale = 1 / (yMax - yMin);
    const normalizedLines: { xValues: number[]; yValues: number[] }[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!normalize) {
            normalizedLines.push({ xValues: line.map(p => p.x), yValues: line.map(p => p.y) });
            continue;
        }

        const xValues = line.map((p) => (p.x - xMin) * xScale * (scaling_x[1] - scaling_x[0]) + scaling_x[0]);
        const yValues = line.map((p) => (p.y - yMin) * yScale * (scaling_y[1] - scaling_y[0]) + scaling_y[0]);
        normalizedLines.push({ xValues, yValues });
    }

    return normalizedLines;
}
