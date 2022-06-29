/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2022-06-29 18:57:49
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React, { useEffect } from 'react';
import { ImportamceLine, Line } from '../core/defs/line';
import { calculateAllLineBandDepth, calculateImportanceLinesWithResampling, resampleLines } from '../core/utils';
import density, { LineData } from '../core/density';
import { computeAllMaximalGroups } from "../core/trend-detector"

interface CanvasProps {
    lines: Line[];
}

export default function Canvas(props: CanvasProps) {
    useEffect(() => {
        const canvas = document.getElementById('diagram') as HTMLCanvasElement;
        const importanceLines = calculateImportanceLinesWithResampling(props.lines, 2, 10, 100);
        const lineData: LineData[] = importanceLines.map((importanceLine: ImportamceLine) => {
            return {
                xValues: new Float32Array(importanceLine.line.map((point: { x: number, y: number }) => point.x)),
                yValues: new Float32Array(importanceLine.line.map((point: { x: number, y: number }) => point.y)),
                globalImportance: importanceLine.globalImportance
            }
        });

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

    }, [props.lines]);
    return (
        <div className="canvas-container">
            <canvas id="diagram" width="1600" height="800"></canvas>
        </div>
    );
}