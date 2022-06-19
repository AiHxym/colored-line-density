/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2022-06-19 21:43:47
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React, { useEffect } from 'react';
import { ImportamceLine, Line } from '../core/defs/line';
import { calculateAllLineBandDepth, calculateImportanceLinesWithResampling } from '../core/utils';
import density, { LineData } from '../core/density';

interface CanvasProps {
    lines: Line[];
}

export default function Canvas(props: CanvasProps) {
    useEffect(() => {
        const canvas = document.getElementById('diagram') as HTMLCanvasElement;
        const importanceLines = calculateImportanceLinesWithResampling(props.lines, 5, 10, 100);
        const lineData: LineData[] = importanceLines.map((importanceLine: ImportamceLine) => {
            return {
                xValues: new Float32Array(importanceLine.line.map((point: { x: number, y: number }) => point.x)),
                yValues: new Float32Array(importanceLine.line.map((point: { x: number, y: number }) => point.y)),
                globalImportance: importanceLine.globalImportance
            }
        });
        console.log(lineData);
        if (lineData.length > 0) {
            const lineDensity = density(
                // the time series data
                [lineData],
                [0, 99, 0, 499],
                // x binning
                { start: 0, stop: 1600, step: 1 },
                // y binning
                { start: 0, stop: 800, step: 1 },
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