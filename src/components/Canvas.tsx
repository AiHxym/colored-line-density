/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2022-07-06 19:23:22
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React, { useEffect } from 'react';
import { ImportamceLine, Line, SegmentedLineDepth } from '../core/defs/line';
import { calculateAllLineBandDepth, calculateImportanceLinesWithResampling, resampleLines, calculateSegmentedDataDepth } from '../core/utils';
import density, { LineData } from '../core/density';
import { computeAllMaximalGroups } from "../core/trend-detector"
import * as d3 from 'd3';

interface CanvasProps {
    lines: Line[];
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


        if (lineData.length > 0) {
            if (lineData[0].segmentedBandDepth) {
                const center50PercentLineNum = Math.round(lineData.length / 2);
                const counter = new Array(lineData[0].xValues.length).fill(0).map(() => ({ low: Infinity, high: -Infinity }));
                for (let i = 0; i < lineData[0].segmentedBandDepth.length; i++) {
                    lineIds.sort((a, b) => (lineData[b].segmentedBandDepth as number[])[i] - (lineData[a].segmentedBandDepth as number[])[i]);
                    for (let lineIdIndex = 0; lineIdIndex < center50PercentLineNum; ++lineIdIndex) {

                        if (lineData[lineIds[lineIdIndex]].yValues[i] > counter[i].high) {
                            counter[i].high = lineData[lineIds[lineIdIndex]].yValues[i];
                        }
                        if (lineData[lineIds[lineIdIndex]].yValues[i] < counter[i].low) {
                            counter[i].low = lineData[lineIds[lineIdIndex]].yValues[i];
                        }
                    }
                }
                plotSvg.append("path")
                    .datum(counter)
                    .attr("fill", "#cce5df")
                    .attr("stroke", "#69b3a2")
                    .attr("stroke-width", 1.5)
                    .attr("d", d3.area<{ low: number; high: number }>()
                        .x((d, index) => index / (counter.length - 1) * 1599)
                        .y0(d => 799 - d.low / 99 * 799)
                        .y1(d => 799 - d.high / 99 * 799));
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