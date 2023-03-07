/*
 * @Author: Yumeng Xue
 * @Date: 2022-11-07 18:09:05
 * @LastEditTime: 2023-03-07 14:40:41
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/renderer.ts
 */
import * as d3 from "d3";
import chroma from "chroma-js";
import { BinningMap } from "./binning";
import { max } from "d3";

const maxChroma = 0.75;
const minChroma = 0.15;
const maxLuminance = 0.95;
const minLuminance = 0.2;

export function render(bins: BinningMap, binDensity: { [key: number]: [[number, number], number][]; }, canvas: HTMLCanvasElement, binSize: number, colorMap: (t: number) => string, hues: number[]): void {
    const clusterColormaps = [d3.interpolateBlues, d3.interpolateGreens, d3.interpolateOranges, d3.interpolatePurples, d3.interpolateReds, d3.interpolateGreys];
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    const width = canvas.width;
    const height = canvas.height;
    const binWidth = width / bins.length;
    const binHeight = height / bins[0].length;

    for (const [key, flattenBins] of Object.entries(binDensity)) {
        for (let flattenBin of flattenBins) {
            const binDensityValue = flattenBin[1];
            const [i, j] = flattenBin[0];
            const binX = i * binWidth;
            const binY = (bins[i].length - j) * binHeight;
            //let binColor = chroma.hcl(45, Math.pow(0.3 + (1.2 - 0.3) * binDensityValue, 1.3) * 100, Math.pow(0.95 - (0.95 - 0.2) * binDensityValue, 1.5) * 100).hex();
            let binColor = "white";
            if (hues.length > 0 && hues[Math.floor(i / binSize) * Math.round(bins[i].length / binSize) + Math.floor(j / binSize)] !== undefined) {
                //console.log(i, j);
                binColor = chroma.hcl(hues[Math.floor(i / binSize) * Math.round(bins[i].length / binSize) + Math.floor(j / binSize)],
                    Math.pow(minChroma + (maxChroma - minChroma) * binDensityValue, 1) * 100,
                    Math.pow(maxLuminance - (maxLuminance - minLuminance) * binDensityValue, 1.5) * 100).hex();
            }
            //binColor = colorMap(1 - binDensityValue);
            ctx.fillStyle = binColor;
            ctx.fillRect(binX, binY, binWidth, binHeight);
        }
    }
}

export function renderPlus(densityValue: number, bins: BinningMap, binDensity: { [key: number]: [[number, number], number][]; }, canvas: HTMLCanvasElement, binSize: number, colorMap: (t: number) => string, hues: number[]): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    const width = canvas.width;
    const height = canvas.height;
    const binWidth = width / bins.length;
    const binHeight = height / bins[0].length;

    if (binDensity[densityValue] !== undefined) {
        const flattenBins = binDensity[densityValue];
        for (let flattenBin of flattenBins) {
            const binDensityValue = flattenBin[1];
            const [i, j] = flattenBin[0];
            const binX = i * binWidth;
            const binY = (bins[i].length - j) * binHeight;
            let binColor = chroma.hcl(45, Math.pow(0.3 + (1.2 - 0.3) * binDensityValue, 1.3) * 100, Math.pow(0.95 - (0.95 - 0.2) * binDensityValue, 1.5) * 100).hex();
            if (hues.length > 0 && hues[Math.floor(i / binSize) * Math.round(bins[i].length / binSize) + Math.floor(j / binSize)] !== undefined) {
                //console.log(i, j);
                binColor = chroma.hcl(hues[Math.floor(i / binSize) * Math.round(bins[i].length / binSize) + Math.floor(j / binSize)],
                    Math.pow(minChroma + (maxChroma - minChroma) * binDensityValue, 1) * 100,
                    Math.pow(maxLuminance - (maxLuminance - minLuminance) * binDensityValue, 1) * 100).hex();
            }
            ctx.fillStyle = binColor;
            ctx.fillRect(binX, binY, binWidth, binHeight);
        }
    }
}

export function renderMinus(densityValue: number, bins: BinningMap, binDensity: { [key: number]: [[number, number], number][]; }, canvas: HTMLCanvasElement, binSize: number, colorMap: (t: number) => string, hues: number[]): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Failed to get canvas context");
    }

    const width = canvas.width;
    const height = canvas.height;
    const binWidth = width / bins.length;
    const binHeight = height / bins[0].length;

    if (binDensity[densityValue] !== undefined) {
        const flattenBins = binDensity[densityValue];
        for (let flattenBin of flattenBins) {
            const [i, j] = flattenBin[0];
            const binX = i * binWidth;
            const binY = (bins[i].length - j) * binHeight;
            const binColor = "#ffffff";
            ctx.fillStyle = binColor;
            ctx.fillRect(binX, binY, binWidth, binHeight);
        }
    }
}