/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2023-03-04 22:42:33
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React, { useEffect, useRef, useState } from 'react';
import { BinningMap } from '../core/binning';
import { render, renderMinus, renderPlus } from '../core/renderer';
import * as d3 from 'd3';

function argMax(arr: number[]) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}


interface CanvasProps {
    width: number;
    height: number;
    binSize: number;
    lines: any[];
    hues: number[];
    binDensity: { [key: number]: [[number, number], number][]; };
    binsInfo: BinningMap;
    clusterProbs: number[][];
    lineProbsofEachCluster: number[][];
    minDisplayDensity: number;
    divideCluster: (x: number, y: number) => void;
}

export default function Canvas(props: CanvasProps) {

    const [isMouseDown, setIsMouseDown] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(29);
    const [strokePickedGrid, setStrokePickedGrid] = useState<Set<string>>(new Set());
    //const [binsInfo, setBinsInfo] = useState<BinningMap>([]);
    const [clusterLabls, setClusterLabels] = useState<number[][]>([]);
    const [clickPoint, setClickPoint] = useState<[number, number] | null>(null);
    const [maxDenstyValue, setMaxDensityValue] = useState<number>(0);

    //const pickedGrid = new Set<string>();

    const prevMinDisplayDensityRef = useRef<number>();

    useEffect(() => {
        if (clickPoint) {
            props.divideCluster(clickPoint[0], clickPoint[1]);
        }
    }, [clickPoint]);

    useEffect(() => {
        if (props.binsInfo.length > 0) {
            const canvas = document.getElementById('diagram') as HTMLCanvasElement;
            render(props.binsInfo, props.binDensity, canvas, props.binSize, d3.interpolateMagma, props.hues);
        }
    }, [props.binDensity, props.hues, props.binSize, props.binsInfo]);

    useEffect(() => {
        if (props.binsInfo.length > 0) {
            const canvas = document.getElementById('diagram') as HTMLCanvasElement;
            console.log(props.minDisplayDensity);
            console.log(prevMinDisplayDensityRef.current);
            if (prevMinDisplayDensityRef.current !== undefined) {
                if (props.minDisplayDensity - prevMinDisplayDensityRef.current > 0) {
                    setTimeout(() => {
                        renderMinus(prevMinDisplayDensityRef.current as number, props.binsInfo, props.binDensity, canvas, props.binSize, d3.interpolateMagma, props.hues);
                    }, 0);
                } else if (props.minDisplayDensity - prevMinDisplayDensityRef.current < 0) {
                    setTimeout(() => {
                        renderPlus(props.minDisplayDensity, props.binsInfo, props.binDensity, canvas, props.binSize, d3.interpolateMagma, props.hues);
                    }, 0);
                }

            }
        }
        prevMinDisplayDensityRef.current = props.minDisplayDensity;
    }, [props.binDensity, props.binSize, props.binsInfo, props.hues, props.minDisplayDensity]);



    return (
        <div className="canvas-container">
            <canvas id="diagram" width={props.width} height={props.height}
                onMouseDown={(event) => {
                    //setIsMouseDown(true);
                }}
                onMouseMove={(event) => {
                    /*
                    if (isMouseDown) {
                        const mouseX = event.nativeEvent.offsetX;
                        const mouseY = event.nativeEvent.offsetY;
                        const mouseGridX = Math.floor(mouseX / 1);
                        const mouseGridY = Math.floor(mouseY / 1);
                        for (let i = mouseGridX - Math.floor(strokeWidth / 2); i <= mouseGridX + Math.floor(strokeWidth / 2); ++i) {
                            for (let j = mouseGridY - Math.floor(strokeWidth / 2); j <= mouseGridY + Math.floor(strokeWidth / 2); ++j) {
                                if (i >= 0 && i < props.width && j >= 0 && j < props.height) {
                                    pickedGrid.add(i + ',' + (props.height - 1 - j));
                                }
                            }
                        }
                    }*/
                }}
                onMouseUp={(event) => {
                    //setIsMouseDown(false);

                    //setStrokePickedGrid(new Set([...strokePickedGrid, ...pickedGrid]));
                    //pickedGrid.clear();
                    //console.log(strokePickedGrid);

                }}
                onClick={(event) => {
                    const mouseX = event.nativeEvent.offsetX;
                    const mouseY = event.nativeEvent.offsetY;
                    setClickPoint([mouseX, props.height - mouseY]);

                }}></canvas>
            <canvas id="extra" width={props.width} height={props.height}></canvas>
            <svg id="extra-renderer" style={{
                width: props.width + 'px',
                height: props.height + 'px',
                pointerEvents: 'none'
            }}></svg>
        </div>
    );
}