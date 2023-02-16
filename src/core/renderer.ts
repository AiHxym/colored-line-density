/*
 * @Author: Yumeng Xue
 * @Date: 2022-11-07 18:09:05
 * @LastEditTime: 2023-02-14 18:00:14
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/renderer.ts
 */
import * as d3 from "d3";
import chroma from "chroma-js";

export function render(binDensity: number[][], canvas: HTMLCanvasElement, binSize: number, colorMap: (t: number) => string, hues: number[], minDisplayDensity: number): void {

    const clusterColormaps = [d3.interpolateBlues, d3.interpolateGreens, d3.interpolateOranges, d3.interpolatePurples, d3.interpolateReds, d3.interpolateGreys];
    const clusterHues = [204, 28, 120, 359, 271, 10, 318, 0, 60, 185];
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    const width = canvas.width;
    const height = canvas.height;
    const binWidth = width / binDensity.length;
    const binHeight = height / binDensity[0].length;

    for (let i = 0; i < binDensity.length; i++) {
        for (let j = 0; j < binDensity[i].length; j++) {
            const binDensityValue = binDensity[i][j];
            const binX = i * binWidth;
            const binY = (binDensity[i].length - j) * binHeight;
            let binColor = chroma.hcl(45, Math.pow(0.3 + (1.2 - 0.3) * binDensityValue, 1.3) * 100, Math.pow(0.95 - (0.95 - 0.2) * binDensityValue, 1.5) * 100).hex();
            if (binDensityValue <= minDisplayDensity) {
                binColor = "#ffffff";
            }
            else if (hues.length > 0 && hues[Math.floor(i / binSize) * Math.round(binDensity[i].length / binSize) + Math.floor(j / binSize)] !== undefined) {
                //console.log(i, j);
                binColor = chroma.hcl(hues[Math.floor(i / binSize) * Math.round(binDensity[i].length / binSize) + Math.floor(j / binSize)], Math.pow(0.3 + (1.2 - 0.3) * binDensityValue, 1) * 100, Math.pow(0.95 - (0.95 - 0.2) * binDensityValue, 1.5) * 100).hex();
            }
            ctx.fillStyle = binColor;
            ctx.fillRect(binX, binY, binWidth, binHeight);
        }
    }

}