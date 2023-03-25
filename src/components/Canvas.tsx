/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2023-03-25 20:02:02
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React, { useEffect, useRef, useState } from 'react';
import { BinningMap } from '../core/binning';
import { render, renderMinus, renderPlus, renderPicked } from '../core/renderer';
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
    minDisplayDensity: number;
    divideCluster: (x: number, y: number) => void;
    pickedBinDensity: number[][];
    pickedHues: number[];
}

export default function Canvas(props: CanvasProps) {

    //const [isMouseDown, setIsMouseDown] = useState(false);
    //const [strokeWidth, setStrokeWidth] = useState(29);
    //const [strokePickedGrid, setStrokePickedGrid] = useState<Set<string>>(new Set());
    //const [binsInfo, setBinsInfo] = useState<BinningMap>([]);
    //const [clusterLabls, setClusterLabels] = useState<number[][]>([]);
    const [clickPoint, setClickPoint] = useState<[number, number] | null>(null);
    //const [maxDenstyValue, setMaxDensityValue] = useState<number>(0);

    //const pickedGrid = new Set<string>();

    const prevMinDisplayDensityRef = useRef<number>();

    useEffect(() => {
        const canvas = document.getElementById('cluster-picker') as HTMLCanvasElement;
        const context = canvas.getContext('2d') as CanvasRenderingContext2D;
        context.clearRect(0, 0, canvas.width, canvas.height);
        if (props.pickedBinDensity.length > 0 && props.pickedHues.length > 0) {

            renderPicked(canvas, props.binsInfo, props.pickedBinDensity, props.binSize, props.pickedHues);
        }
    }, [props.binSize, props.binsInfo, props.pickedBinDensity, props.pickedHues]);

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
                const startDensity = prevMinDisplayDensityRef.current as number;
                const endDensity = props.minDisplayDensity;
                if (props.minDisplayDensity - prevMinDisplayDensityRef.current > 0) {
                    setTimeout(() => {
                        // console.log(prevMinDisplayDensityRef.current as number)
                        // console.log(props.minDisplayDensity)
                        for (let i = startDensity; i < endDensity; ++i) {
                            renderMinus(i, props.binsInfo, props.binDensity, canvas, props.binSize, d3.interpolateMagma, props.hues);
                        }
                    }, 0);
                } else if (props.minDisplayDensity - prevMinDisplayDensityRef.current < 0) {
                    setTimeout(() => {
                        for (let i = startDensity - 1; i >= endDensity; --i) {
                            renderPlus(i, props.binsInfo, props.binDensity, canvas, props.binSize, d3.interpolateMagma, props.hues);
                        }
                    }, 0);
                }

            }
        }
        prevMinDisplayDensityRef.current = props.minDisplayDensity;
    }, [props.binDensity, props.binSize, props.binsInfo, props.hues, props.minDisplayDensity]);



    return (
        <div className="canvas-container">
            <canvas id="diagram" style={{ border: '1px solid black' }}
                width={props.width} height={props.height}
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
            <canvas id="cluster-picker" style={{ border: '1px solid black' }}
                width={props.width} height={props.height} />
            {/* <svg id="extra-renderer" style={{
                width: props.width + 'px',
                height: props.height + 'px',
                pointerEvents: 'none'
            }}></svg> */}
        </div>
    );
}