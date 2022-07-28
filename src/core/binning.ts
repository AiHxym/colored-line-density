/*
 * @Author: Yumeng Xue
 * @Date: 2022-07-28 15:56:47
 * @LastEditTime: 2022-07-28 21:34:59
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

export function binning(lines: Line[], binX: BinConfig, binY: BinConfig, normalize: boolean) {
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

    const bins: Set<number>[][] =
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
            console.log(headInterpolateY, tailInterpolateY);

            if (isNaN(headInterpolateY) && isNaN(tailInterpolateY)) {
                continue;
            } else if (isNaN(headInterpolateY)) {
                headInterpolateY = line[0].y;
            } else if (isNaN(tailInterpolateY)) {
                tailInterpolateY = line[line.length - 1].y;
            }

            for (let j = binY.start; j < binY.stop; j += binY.step) {
                const binHeadY = j;
                const binTailY = j + binY.step;
                if ((headInterpolateY >= binHeadY && headInterpolateY <= binTailY) ||
                    (tailInterpolateY >= binHeadY && tailInterpolateY <= binTailY) ||
                    (headInterpolateY < binHeadY && tailInterpolateY > binTailY) ||
                    (headInterpolateY > binHeadY && tailInterpolateY < binTailY)) {
                    bins[Math.round((binHeadX - binX.start) / binX.step)][Math.round((binHeadY - binY.start) / binY.step)].add(index);
                }
            }
        }
    });

    return bins;
}