/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2022-07-28 20:48:28
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React, { useEffect } from 'react';
import { ImportamceLine, Line, SegmentedLineDepth } from '../core/defs/line';
import { calculateAllLineBandDepth, calculateImportanceLinesWithResampling, resampleLines, calculateSegmentedDataDepth } from '../core/utils';
import { binning } from '../core/binning';
import density, { LineData } from '../core/density';
import { computeAllMaximalGroups } from "../core/trend-detector"
import { getKDE } from '../core/kde';
import * as PCA from '../core/PCA';
import * as d3 from 'd3';

interface CanvasProps {
    lines: Line[];
    lowDimensionalLines: number[][];
}

export default function Canvas(props: CanvasProps) {
    useEffect(() => {
        const canvas = document.getElementById('diagram') as HTMLCanvasElement;

        const plotSvg = d3.select("#plots");

        /*
            const importanceLines = calculateImportanceLinesWithResampling(props.lines, 2, 10, 100);
            const lineData: LineData[] = importanceLines.map((importanceLine: ImportamceLine) => {
                return {
                    xValues: new Float32Array(importanceLine.line.map((point: { x: number, y: number }) => point.x)),
                    yValues: new Float32Array(importanceLine.line.map((point: { x: number, y: number }) => point.y)),
                    globalImportance: importanceLine.globalImportance
                }
            });
        */

        const segmentedLineDepths = calculateSegmentedDataDepth(props.lines, 2, 200, 100, 1);
        const lineData: LineData[] = segmentedLineDepths.map((segmentedLineDepth: SegmentedLineDepth, index: number) => {
            return {
                xValues: new Float32Array(segmentedLineDepth.line.map((point: { x: number, y: number }) => point.x)),
                yValues: new Float32Array(segmentedLineDepth.line.map((point: { x: number, y: number }) => point.y)),
                segmentedBandDepth: segmentedLineDepth.segmentedBandDepth,
                globalImportance: 1.0
            }
        });

        const lineIds = new Array(lineData.length).fill(0).map((_, index) => index);

        const bins = binning(props.lines, { start: 0, stop: 1000, step: 1 }, { start: 0, stop: 500, step: 1 }, true);
        console.log(bins);

        if (lineData.length > 0) {
            if (lineData[0].segmentedBandDepth) {
                const center50PercentLineNum = Math.round(lineData.length / 2);
                const counter = new Array(lineData[0].xValues.length).fill(0).map(() => ({ low: Infinity, high: -Infinity }));
                const center50PercentLineSetVectors =
                    new Array(lineData[0].xValues.length)
                        .fill(0)
                        .map(() => new Array(lineData.length).fill(0));

                for (let i = 0; i < lineData[0].segmentedBandDepth.length; i++) {
                    lineIds.sort((a, b) => (lineData[b].segmentedBandDepth as number[])[i] - (lineData[a].segmentedBandDepth as number[])[i]);
                    for (let lineIdIndex = 0; lineIdIndex < center50PercentLineNum; ++lineIdIndex) {
                        center50PercentLineSetVectors[i][lineIds[lineIdIndex]] = 1;
                        if (lineData[lineIds[lineIdIndex]].yValues[i] > counter[i].high) {
                            counter[i].high = lineData[lineIds[lineIdIndex]].yValues[i];
                        }
                        if (lineData[lineIds[lineIdIndex]].yValues[i] < counter[i].low) {
                            counter[i].low = lineData[lineIds[lineIdIndex]].yValues[i];
                        }
                    }
                }

                const PCAVectors = PCA.getEigenVectors(center50PercentLineSetVectors);
                const dimReducedData = PCA.computeAdjustedData(center50PercentLineSetVectors, PCAVectors[0], PCAVectors[1], PCAVectors[2]).adjustedData;
                for (let dim = 0; dim < dimReducedData.length; dim++) {
                    const dimAvg = dimReducedData[dim].reduce((acc, cur) => acc + cur, 0) / dimReducedData[dim].length;
                    dimReducedData[dim] = dimReducedData[dim].map(x => x - dimAvg);
                    const dimMax = Math.max(...dimReducedData[dim]);
                    const dimMin = Math.min(...dimReducedData[dim]);
                    dimReducedData[dim] = dimReducedData[dim].map(x => (x - dimMin) / (dimMax - dimMin));
                }
                const colorForSegments = new Array(dimReducedData[0].length).fill(0).map((value, index) => [dimReducedData[0][index], dimReducedData[1][index], dimReducedData[2][index]]);


                // KDE Peak Method
                let oneDimensionalData = PCA.computeAdjustedData(center50PercentLineSetVectors, PCAVectors[0]).adjustedData[0];
                const dimAvg = oneDimensionalData.reduce((acc, cur) => acc + cur, 0) / dimReducedData.length;
                oneDimensionalData = oneDimensionalData.map(x => x - dimAvg);
                const dimMax = Math.max(...oneDimensionalData);
                const dimMin = Math.min(...oneDimensionalData);
                oneDimensionalData = oneDimensionalData.map(x => (x - dimMin) / (dimMax - dimMin));
                const kdeResult = getKDE(oneDimensionalData, 0.05);
                //console.log(oneDimensionalData);
                //console.log(kdeResult);

                const peakRanges: [number, number][] = [];

                for (let peakId of kdeResult.peaks) {
                    const threshold = kdeResult.estimate[peakId].y / 1.7;
                    let peakStart = 0;
                    let peakEnd = kdeResult.estimate.length - 1;
                    for (let i = peakId - 1; i >= 0; --i) {
                        if (kdeResult.estimate[i].y < threshold) {
                            peakStart = i;
                            break;
                        }
                    }
                    for (let i = peakId + 1; i < kdeResult.estimate.length; i++) {
                        if (kdeResult.estimate[i].y < threshold) {
                            peakEnd = i;
                            break;
                        }
                    }
                    peakRanges.push([peakStart, peakEnd]);
                }

                console.log(peakRanges);

                const oneDimensionalColor = new Array(oneDimensionalData.length).fill("#A9A9A9");
                for (let i = 0; i < oneDimensionalData.length; i++) {
                    for (let peakRangeId = 0; peakRangeId < peakRanges.length; ++peakRangeId) {
                        if (oneDimensionalData[i] >= kdeResult.estimate[peakRanges[peakRangeId][0]].x && oneDimensionalData[i] <= kdeResult.estimate[peakRanges[peakRangeId][1]].x) {
                            oneDimensionalColor[i] = d3.schemeCategory10[peakRangeId];
                        }
                    }
                }





                const defs = plotSvg.append("defs");
                const gradient = defs.append("linearGradient")
                    .attr("id", "boxplot-gradient")
                    .attr("x1", "0%")
                    .attr("y1", "0%")
                    .attr("x2", "100%")
                    .attr("y2", "0%");
                for (let i = 0; i < colorForSegments.length; i++) {
                    gradient.append("stop")
                        .attr("offset", `${i / colorForSegments.length * 100}%`)
                        .attr("stop-color", `rgb(${colorForSegments[i][0] * 255}, ${colorForSegments[i][1] * 255}, ${colorForSegments[i][2] * 255})`)
                        .attr("stop-opacity", 1);
                }

                const oneDGradient = defs.append("linearGradient")
                    .attr("id", "1d-gradient")
                    .attr("x1", "0%")
                    .attr("y1", "0%")
                    .attr("x2", "100%")
                    .attr("y2", "0%");
                for (let i = 0; i < oneDimensionalColor.length; ++i) {
                    oneDGradient.append("stop")
                        .attr("offset", `${i / oneDimensionalColor.length * 100}%`)
                        .attr("stop-color", oneDimensionalColor[i])
                        .attr("stop-opacity", 1);
                }

                const counterPoints = counter.map((value, index) => {
                    return {
                        x: index / (counter.length - 1) * 1599,
                        y: 799 - value.low / 99 * 799
                    }
                }).concat(counter.map((value, index) => {
                    return {
                        x: index / (counter.length - 1) * 1599,
                        y: 799 - value.high / 99 * 799
                    }
                }).reverse());
                const counterLine = d3.line<{ x: number; y: number }>()
                    .x((d, index) => d.x)
                    .y((d, index) => d.y)
                    .curve(d3.curveBasisClosed);



                const segmentedCurveBoxplot = plotSvg.append("path")
                    .attr("fill", "url(#boxplot-gradient)")
                    .attr("stroke", "#69b3a2")
                    .attr("stroke-width", 1.5)
                    .attr("d", counterLine(counterPoints));




                segmentedCurveBoxplot.on("mousemove", (event: MouseEvent) => {
                    const mouseX = event.offsetX;
                    const mouseY = event.offsetY;
                    const mouseCounter = new Array(lineData[0].xValues.length).fill(0).map(() => ({ low: Infinity, high: -Infinity }));
                    const segmentId = Math.floor(mouseX / 1599 * (counter.length - 1));
                    lineIds.sort((a, b) => (lineData[b].segmentedBandDepth as number[])[segmentId] - (lineData[a].segmentedBandDepth as number[])[segmentId]);
                    for (let lineIdIndex = 0; lineIdIndex < center50PercentLineNum; ++lineIdIndex) {
                        for (let i = 0; i < mouseCounter.length; ++i) {
                            if (lineData[lineIds[lineIdIndex]].yValues[i] > mouseCounter[i].high) {
                                mouseCounter[i].high = lineData[lineIds[lineIdIndex]].yValues[i];
                            }
                            if (lineData[lineIds[lineIdIndex]].yValues[i] < mouseCounter[i].low) {
                                mouseCounter[i].low = lineData[lineIds[lineIdIndex]].yValues[i];
                            }
                        }
                    }
                    segmentedCurveBoxplot
                        .datum(mouseCounter)
                        .attr("fill", oneDimensionalColor[segmentId])
                        .attr("stroke", "#69b3a2")
                        .attr("d", d3.area<{ low: number; high: number }>()
                            .x((d, index) => index / (mouseCounter.length - 1) * 1599)
                            .y0(d => 799 - d.low / 99 * 799)
                            .y1(d => 799 - d.high / 99 * 799));

                }).on("mouseout", (event: MouseEvent) => {
                    segmentedCurveBoxplot
                        .datum(counter)
                        .attr("fill", "url(#1d-gradient)")
                        .attr("stroke", "#69b3a2")
                        .attr("d", counterLine(counterPoints));
                });
                console.log(counter);
            }
        }




        /*

        if (props.lines.length > 0) {
            const groups = computeAllMaximalGroups(resampleLines(props.lines, [1, 52], 52), [15, 17], [-1000, 1000], 0.14285714285713878302086499161305255256);
            groups.sort((a, b) => b.support - a.support);
            console.log(groups);
        }
        */

        if (lineData.length > 0) {
            const lineDensity = density(
                // the time series data
                [lineData],
                [0, 99, 0, 99],
                // x binning
                { start: 0, stop: 99, step: 0.061875 },
                // y binning
                { start: 0, stop: 99, step: 0.12375 },
                canvas,
                [[0, 0, 0], [0, 1, 0], [0, 0, 0]]
            );

            lineDensity.then((result) => {
                result.destroy();
            });
        }
    }, [props.lines]);
    return (
        <div className="canvas-container">
            <canvas id="diagram" width="1600" height="800"></canvas>
            <svg id="plots" style={{
                position: 'relative',
                top: '-806px',
                width: '1600px',
                height: '800px'
            }}></svg>
        </div>
    );
}