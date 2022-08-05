/*
 * @Author: Yumeng Xue
 * @Date: 2022-07-28 15:56:47
 * @LastEditTime: 2022-08-05 14:55:40
 * @LastEditors: Yumeng Xue
 * @Description: Binning for lines
 * @FilePath: /trend-mixer/src/core/binning.ts
 */
import { interpolate1D } from "./math/interpolation";
import { Line } from "./defs/line";

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

export type BinningMap = Set<number>[][];

export function binning(lines: Line[], binX: BinConfig, binY: BinConfig, normalize: boolean, normalizeDensity: boolean): BinningMap {
    let processingLines: Line[] = [];
    if (normalize) {
        const minX = Math.min(...lines.map(line => Math.min(...line.map(point => point.x))));
        const maxX = Math.max(...lines.map(line => Math.max(...line.map(point => point.x))));
        const minY = Math.min(...lines.map(line => Math.min(...line.map(point => point.y))));
        const maxY = Math.max(...lines.map(line => Math.max(...line.map(point => point.y))));

        // normalize by bin config
        processingLines = lines.map(line => line.map(point => (
            {
                x: (point.x - minX) / (maxX - minX) * (binX.stop - binX.start) + binX.start,
                y: (point.y - minY) / (maxY - minY) * (binY.stop - binY.start) + binY.start
            })));
    }
    else {
        processingLines = lines;
    }

    const bins: BinningMap =
        new Array((binX.stop - binX.start) / binX.step)
            .fill(0)
            .map(() => new Array((binY.stop - binY.start) / binY.step).fill(0).map(() => new Set<number>()));

    processingLines.forEach((line, index) => {
        const interpolateFunc = interpolate1D(line);
        for (let i = binX.start; i < binX.stop; i += binX.step) {
            const binHeadX = i;
            const binTailX = i + binX.step;
            let headInterpolateY = interpolateFunc(binHeadX);
            let tailInterpolateY = interpolateFunc(binTailX);

            if (isNaN(headInterpolateY) && isNaN(tailInterpolateY)) {
                continue;
            } else if (isNaN(headInterpolateY)) {
                headInterpolateY = line[0].y;
            } else if (isNaN(tailInterpolateY)) {
                tailInterpolateY = line[line.length - 1].y;
            }

            const topY = Math.max(headInterpolateY, tailInterpolateY);
            const bottomY = Math.min(headInterpolateY, tailInterpolateY);

            let topBinId = Math.floor((topY - binY.start) / binY.step);
            let bottomBinId = Math.floor((bottomY - binY.start) / binY.step);

            if ((topY - binY.start) / binY.step - topBinId < 1e-6) {
                --topBinId;
            }
            if (bottomBinId < 0) {
                bottomBinId = 0;
            }
            //console.log(bottomBinId, topBinId);

            for (let j = bottomBinId; j <= topBinId; ++j) {
                bins[Math.round((binHeadX - binX.start) / binX.step)][j].add(index);
            }
        }
    });

    return bins;
}