/*
 * @Author: Yumeng Xue
 * @Date: 2022-07-29 12:55:35
 * @LastEditTime: 2022-09-14 18:02:31
 * @LastEditors: Yumeng Xue
 * @Description: Render line density map for binning map
 * @FilePath: /trend-mixer/src/core/renderer.ts
 */
import { BinningMap } from "./binning";
import * as d3 from "d3";

function rgb2hsl(r: number, g: number, b: number): [number, number, number] {
    // get the min and max of r,g,b
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // lightness is the average of the largest and smallest color components
    let lum = (max + min) / 2;
    let hue = 0;
    let sat;
    if (max === min) { // no saturation
        hue = 0;
        sat = 0;
    } else {
        let c = max - min; // chroma
        // saturation is simply the chroma scaled to fill
        // the interval [0, 1] for every combination of hue and lightness
        sat = c / (1 - Math.abs(2 * lum - 1));
        switch (max) {
            case r:
                // hue = (g - b) / c;
                // hue = ((g - b) / c) % 6;
                // hue = (g - b) / c + (g < b ? 6 : 0);
                break;
            case g:
                hue = (b - r) / c + 2;
                break;
            case b:
                hue = (r - g) / c + 4;
                break;
        }
    }
    hue = Math.round(hue * 60); // °
    sat = Math.round(sat * 100); // %
    lum = Math.round(lum * 100); // %
    return [hue, sat, lum];
}


export function render(bins: BinningMap, canvas: HTMLCanvasElement, colorMap: (t: number) => string, representVectors: number[][][], features: number[][], clusters: number[]): void {

    const clusterColormaps = [d3.interpolateBlues, d3.interpolateGreens, d3.interpolateOranges, d3.interpolatePurples, d3.interpolateReds, d3.interpolateGreys];
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
            let binColor = colorMap(1.0 - bin.size / maxDensityValue);
            if (bin.size === 0) {
                binColor = "white";
            }
            if (representVectors.length > 0 && representVectors[i][j].length > 0) {
                binColor = "rgb(" + representVectors[i][j].map(c => c * 255 * bin.size / maxDensityValue).join(",") + ")";
            }

            if (features.length > 0 && bin.size > 0 && features[i * bins[0].length + j]) {
                const feature = features[i * bins[0].length + j];
                //console.log(i, j);
                //binColor = "rgb(" + features[i * bins[0].length + j].map(c => c * 255 * (bin.size / maxDensityValue * 0.3 + 0.7) * 2).join(",") + ")";
                //binColor = "hsl(" + rgb2hsl(color[0], color[1], color[2])[0] + `, ${bin.size / maxDensityValue * 100}%, 50%)`;
                const mixed_rgb = [0, 0, 0];
                for (let i in feature) {
                    const color = clusterColormaps[parseInt(i)](bin.size / maxDensityValue);
                    const rgb = color.substring(4, color.length - 1)
                        .replace(/ /g, '')
                        .split(',');
                    for (let j in rgb) {
                        mixed_rgb[j] += parseInt(rgb[j]) * feature[i];
                    }
                }
                binColor = "rgb(" + mixed_rgb.join(",") + ")";
            }
            if (clusters.length > 0 && clusters[i * bins[0].length + j] !== undefined && bin.size > 0) {
                const cluster = clusters[i * bins[0].length + j];
                //console.log(i, j);
                binColor = clusterColormaps[Math.round(cluster)](bin.size / maxDensityValue);
                //binColor = "hsl(" + rgb2hsl(color[0], color[1], color[2])[0] + `, ${bin.size / maxDensityValue * 100}%, 50%)`;
            }
            ctx.fillStyle = binColor;
            ctx.fillRect(binX, binY, binWidth, binHeight);
        }
    }

}

export function renderExtra(bins: BinningMap, canvas: HTMLCanvasElement, gridCoordinates: Set<string>, gridColors: number[][]): void {
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
    for (let [index, gridCoordinate] of [...gridCoordinates].entries()) {
        const [i, j] = gridCoordinate.split(",").map(Number);
        const bin = bins[i][j];
        const binX = i * binWidth;
        const binY = (bins[i].length - j) * binHeight;
        const binColor = gridColors.map(dimension => dimension[index]);
        ctx.fillStyle = "rgb(" + binColor.map(c => c * 255 * (bin.size / maxDensityValue * 0.3 + 0.7) * 2).join(",") + ")";
        ctx.fillRect(binX, binY, binWidth, binHeight);
    }
}