/*
 * @Author: Yumeng Xue
 * @Date: 2022-07-29 12:55:35
 * @LastEditTime: 2022-08-01 20:48:50
 * @LastEditors: Yumeng Xue
 * @Description: Render line density map for binning map
 * @FilePath: /trend-mixer/src/core/renderer.ts
 */
import { BinningMap } from "./binning";

export function render(bins: BinningMap, canvas: HTMLCanvasElement, colorMap: (t: number) => string, representVectors: number[][][], features: number[][]): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    const maxDensityValue = Math.max(...bins.map(binColumn => Math.max(...binColumn.map(bin => bin.size))));

    const width = canvas.width;
    const height = canvas.height;
    const binWidth = width / bins.length;
    const binHeight = height / bins[0].length;
    //ctx.scale(1, -1);
    for (let i = 0; i < bins.length; i++) {
        for (let j = 0; j < bins[i].length; j++) {
            const bin = bins[i][j];
            const binX = i * binWidth;
            const binY = (bins[i].length - j) * binHeight;
            let binColor = colorMap(bin.size / maxDensityValue);
            if (representVectors.length > 0 && representVectors[i][j].length > 0) {
                binColor = "rgb(" + representVectors[i][j].map(c => c * 255 * bin.size / maxDensityValue).join(",") + ")";
            }

            if (features.length > 0 && bin.size > 0 && features[i * bins[0].length + j]) {
                //console.log(i, j);
                binColor = "rgb(" + features[i * bins[0].length + j].map(c => c * 255 * bin.size / maxDensityValue * 4.5).join(",") + ")";
            }
            ctx.fillStyle = binColor;
            ctx.fillRect(binX, binY, binWidth, binHeight);
        }
    }

}