/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2022-07-06 00:21:17
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React, { useEffect } from 'react';
import { ImportamceLine, Line, SegmentedLineDepth } from '../core/defs/line';
import { calculateAllLineBandDepth, calculateImportanceLinesWithResampling, resampleLines, calculateSegmentedDataDepth } from '../core/utils';
import density, { LineData } from '../core/density';
import { computeAllMaximalGroups } from "../core/trend-detector"

interface CanvasProps {
    lines: Line[];
}

export default function Canvas(props: CanvasProps) {
    useEffect(() => {
        const canvas = document.getElementById('diagram') as HTMLCanvasElement;
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

        const segmentedLineDepths = calculateSegmentedDataDepth(props.lines, 2, 1000, 100, 1);
        const lineData: LineData[] = segmentedLineDepths.map((segmentedLineDepth: SegmentedLineDepth, index: number) => {
            return {
                xValues: new Float32Array(segmentedLineDepth.line.map((point: { x: number, y: number }) => point.x)),
                yValues: new Float32Array(segmentedLineDepth.line.map((point: { x: number, y: number }) => point.y)),
                segmentedBandDepth: segmentedLineDepth.segmentedBandDepth,
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
            }
        }




        /*

        if (props.lines.length > 0) {
            const groups = computeAllMaximalGroups(resampleLines(props.lines, [1, 52], 52), [15, 17], [-1000, 1000], 0.14285714285713878302086499161305255256);
            groups.sort((a, b) => b.support - a.support);
            console.log(groups);
        }

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
        */
    }, [props.lines]);
    return (
        <div className="canvas-container">
            <canvas id="diagram" width="1600" height="800"></canvas>
        </div>
    );
}