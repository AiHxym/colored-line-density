/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2023-02-13 10:40:11
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React, { useEffect, useState } from 'react';
import { ImportamceLine, Line, SegmentedLineDepth } from '../core/defs/line';
import { calculateAllLineBandDepth, calculateImportanceLinesWithResampling, resampleLines, calculateSegmentedDataDepth } from '../core/utils';
import { binning, BinningMap } from '../core/binning';
import { render } from '../core/render';
import { renderSketch } from '../core/renderer';
import density, { LineData } from '../core/density';
import { computeAllMaximalGroups } from "../core/trend-detector"
import { getKDE } from '../core/kde';
import * as PCA from '../core/PCA';
import * as d3 from 'd3';
import { bin, cluster, greatestIndex, line } from 'd3';
import kmeans, { Distance, quickSilhouetteScore } from '../core/kmeans';
import axios from 'axios';


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
    lines: Line[];
    lowDimensionalLines: number[][];
    features: number[][];
    clusters: number[];
    hues: number[];
    binDensity: number[][];
    binsInfo: BinningMap;
    clusterProbs: number[][];
    lineProbsofEachCluster: number[][];
    divideCluster: (x: number, y: number) => void;
    setHues: (hues: number[]) => void;
}

export default function Canvas(props: CanvasProps) {

    const [isMouseDown, setIsMouseDown] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(29);
    const [strokePickedGrid, setStrokePickedGrid] = useState<Set<string>>(new Set());
    //const [binsInfo, setBinsInfo] = useState<BinningMap>([]);
    const [clusterLabls, setClusterLabels] = useState<number[][]>([]);
    const [clickPoint, setClickPoint] = useState<[number, number] | null>(null);
    const [maxDenstyValue, setMaxDensityValue] = useState<number>(0);

    const pickedGrid = new Set<string>();


    // useEffect(() => {
    //     const canvas = document.getElementById('diagram') as HTMLCanvasElement;
    //     const ctx = canvas.getContext("2d");
    //     if (!ctx) {
    //         throw new Error("Failed to get canvas context");
    //     }
    //     if (strokePickedGrid.size > 0) {
    //         let pickedLines = new Set<number>();
    //         for (let girdCoordinates of strokePickedGrid) {
    //             const [x, y] = girdCoordinates.split(',').map(Number);
    //             pickedLines = new Set([...pickedLines, ...props.binsInfo[x][y]]);
    //         }

    //         const width = canvas.width;
    //         const height = canvas.height;
    //         const binWidth = width / props.binsInfo.length;
    //         const binHeight = height / props.binsInfo[0].length;

    //         for (let i = 0; i < props.binsInfo.length; i++) {
    //             for (let j = 0; j < props.binsInfo[0].length; j++) {
    //                 const bin = props.binsInfo[i][j];
    //                 if ((new Set([...pickedLines].filter((val: number) => bin.has(val)))).size > 0) {
    //                     const binX = i * binWidth;
    //                     const binY = (props.binsInfo[i].length - j) * binHeight;

    //                     ctx.fillStyle = d3.interpolateOranges((bin.size / 20) * 0.7 + 0.3);
    //                     ctx.fillRect(binX, binY, binWidth, binHeight);
    //                 }

    //             }
    //         }
    //     }
    // }, [strokePickedGrid, props.binsInfo]);

    useEffect(() => {
        if (clickPoint) {
            /*
            const selectedClusterId = argMax(props.clusterProbs[clickPoint[0] * 500 + 499 - clickPoint[1]]);
            console.log(selectedClusterId);
            //console.log(selectedClusterId);
            const selectedLines = props.lines.filter((line, index) => props.lineProbsofEachCluster[index][selectedClusterId] > 0.1);
            const bins = binning(selectedLines, { start: 0, stop: 1000, step: 1 }, { start: 0, stop: 500, step: 1 }, false, false);
            const canvas = document.getElementById('extra') as HTMLCanvasElement;
            renderSketch(bins, canvas, (d) => d3.interpolateMagma(d), [], [], [], []);
            const svg = d3.select('#extra-renderer');
            svg.selectAll('path').remove();
            svg.selectAll('path')
                .data(selectedLines)
                .enter()
                .append('path')
                .attr('d', (d) => {
                    return d3.line()(d.map((point) => [point.x, 499 - point.y]));
                })
                .attr('stroke', 'orange')
                .attr('stroke-width', 1)
                .attr('fill', 'none');
            console.log(selectedLines);
            */
            props.divideCluster(clickPoint[0], clickPoint[1]);

        }
    }, [clickPoint]);

    /*
    useEffect(() => {
        const canvas = document.getElementById('diagram') as HTMLCanvasElement;
        if (strokePickedGrid.size > 0) {
            const lineIdVectors = [];
            for (let girdCoordinates of strokePickedGrid) {
                const lineIdVector = new Array(props.lines.length).fill(0);
                const [x, y] = girdCoordinates.split(',').map(Number);
                for (let lineId of binsInfo[x][y]) {
                    lineIdVector[lineId] = 1;
                }
                lineIdVectors.push(lineIdVector);
            }
            console.log(lineIdVectors);
            const eigenVectors = PCA.getEigenVectors(lineIdVectors);
            const dimReducedData = PCA.computeAdjustedData(lineIdVectors, eigenVectors[0], eigenVectors[1], eigenVectors[2]).adjustedData;
            for (let dimension of dimReducedData) {
                const maxNumber = Math.max(...dimension);
                const minNumber = Math.min(...dimension);
                for (let i = 0; i < dimension.length; i++) {
                    dimension[i] = (dimension[i] - minNumber) / (maxNumber - minNumber);
                }
            }
            console.log(dimReducedData);
            renderExtra(binsInfo, canvas, strokePickedGrid, dimReducedData);
        }
    }, [binsInfo, props.lines.length, strokePickedGrid]);
    */

    /*
    useEffect(() => {
        if (clickPoint) {
            const selectedClusterId = clusterLabls[clickPoint[0]][799 - clickPoint[1]];
            let maxClusterId = clusterLabls[0][0];
            for (let i = 1; i < clusterLabls.length; ++i) {
                for (let j = 1; j < clusterLabls[i].length; ++j) {
                    if (clusterLabls[i][j] > maxClusterId) {
                        maxClusterId = clusterLabls[i][j];
                    }
                }
            }
            const selectedCluster: { x: number; y: number; feature: number[] }[] = [];
            for (let i = 0; i < clusterLabls.length; ++i) {
                for (let j = 0; j < clusterLabls[i].length; ++j) {
                    if (clusterLabls[i][j] === selectedClusterId && binsInfo[i][j].size / maxDenstyValue > 0.15) {
                        selectedCluster.push({ x: i, y: j, feature: props.features[i * clusterLabls[i].length + j] });
                    }
                }
            }
            console.log(selectedCluster);
    
            const silhouetteScores = [];
            for (let i = 2; i < 5; ++i) {
                const KR = kmeans(selectedCluster.map(v => v.feature), i);
                silhouetteScores.push(quickSilhouetteScore(KR, selectedCluster));
            }
            const properK = silhouetteScores.indexOf(Math.max(...silhouetteScores)) + 2;
            const clusteringResult = kmeans(selectedCluster.map(v => v.feature), properK, "kmeans++");
    
            const clickPointFeature = props.features[clickPoint[0] * clusterLabls[0].length + 799 - clickPoint[1]];
            let minDistanceToClickPoint = Infinity;
            let minDistanceToClickPointClusterId = -1;
            for (let i = 0; i < clusteringResult.centroids.length; ++i) {
                const distance = Distance.euclideanDist(clickPointFeature, clusteringResult.centroids[i]);
                if (distance < minDistanceToClickPoint) {
                    minDistanceToClickPoint = distance;
                    minDistanceToClickPointClusterId = i;
                }
            }
    
            console.log(clusteringResult);
            const newClusterLabls: number[][] = structuredClone(clusterLabls);
            for (let i = 0; i < clusterLabls.length; ++i) {
                for (let j = 0; j < clusterLabls[i].length; ++j) {
                    if (clusterLabls[i][j] === selectedClusterId) {
                        let minDistanceToPoint = Infinity;
                        let minDistanceToPointClusterId = -1;
                        for (let k = 0; k < clusteringResult.centroids.length; ++k) {
                            const distance = Distance.euclideanDist(props.features[i * clusterLabls[i].length + j], clusteringResult.centroids[k]);
                            if (distance < minDistanceToPoint) {
                                minDistanceToPoint = distance;
                                minDistanceToPointClusterId = k;
                            }
                        }
    
                        if (minDistanceToPointClusterId === minDistanceToClickPointClusterId) {
                            newClusterLabls[i][j] = maxClusterId + 1;
                        } else {
                            newClusterLabls[i][j] = selectedClusterId;
                        }
                    }
                }
            }
            setClusterLabels(newClusterLabls)
        }
    }, [clickPoint, props.features, binsInfo, maxDenstyValue]);
    */

    /*
    useEffect(() => {
        if (clusterLabls.length > 0 && binsInfo.length > 0) {
            console.log(clusterLabls);
            const canvas = document.getElementById('diagram') as HTMLCanvasElement;
            render(binsInfo, canvas, d3.interpolateMagma, [], [], clusterLabls.flat(), props.hues);
        }
    }, [binsInfo, clusterLabls, props.hues]);
    */

    useEffect(() => {
        if (props.binDensity.length > 0) {
            const canvas = document.getElementById('diagram') as HTMLCanvasElement;
            render(props.binDensity, canvas, props.binSize, d3.interpolateMagma, props.hues);
        }
    }, [props.binDensity, props.hues]);



    return (
        <div className="canvas-container">
            <canvas id="diagram" width={props.width} height={props.height}
                onMouseDown={(event) => {
                    setIsMouseDown(true);
                }}
                onMouseMove={(event) => {

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
                    }
                }}
                onMouseUp={(event) => {
                    setIsMouseDown(false);

                    setStrokePickedGrid(new Set([...strokePickedGrid, ...pickedGrid]));
                    pickedGrid.clear();
                    console.log(strokePickedGrid);

                }}
                onClick={(event) => {
                    const mouseX = event.nativeEvent.offsetX;
                    const mouseY = event.nativeEvent.offsetY;
                    console.log(mouseX, mouseY);
                    axios.post('http://134.34.231.83:8080/divied_cluster', {
                        x: mouseX,
                        y: 499 - mouseY,
                    })
                        .then(function (response) {
                            console.log(response);
                            props.setHues(response.data.hues)
                            //setHues(response.data);
                        })
                        .catch(function (error) {
                            console.log(error);
                        });
                    setClickPoint([mouseX, mouseY]);

                }}></canvas>
            {/*<svg id="plots" style={{
                position: 'relative',
                top: '-806px',
                width: '1600px',
                height: '800px'
            }}></svg>*/}
            <canvas id="extra" width={props.width} height={props.height}></canvas>
            <svg id="extra-renderer" style={{
                width: props.width + 'px',
                height: props.height + 'px',
                pointerEvents: 'none'
            }}></svg>
        </div>
    );
}