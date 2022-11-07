/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2022-11-07 18:25:03
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React, { useEffect, useState } from 'react';
import { ImportamceLine, Line, SegmentedLineDepth } from '../core/defs/line';
import { calculateAllLineBandDepth, calculateImportanceLinesWithResampling, resampleLines, calculateSegmentedDataDepth } from '../core/utils';
import { binning, BinningMap } from '../core/binning';
import { render } from '../core/render_plus';
import density, { LineData } from '../core/density';
import { computeAllMaximalGroups } from "../core/trend-detector"
import { getKDE } from '../core/kde';
import * as PCA from '../core/PCA';
import * as d3 from 'd3';
import { bin, cluster, greatestIndex } from 'd3';
import kmeans, { Distance, quickSilhouetteScore } from '../core/kmeans';



interface CanvasProps {
    lines: Line[];
    lowDimensionalLines: number[][];
    features: number[][];
    clusters: number[];
    hues: number[];
    binDensity: number[][];
}

export default function Canvas(props: CanvasProps) {

    const [isMouseDown, setIsMouseDown] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(29);
    const [strokePickedGrid, setStrokePickedGrid] = useState<Set<string>>(new Set());
    const [binsInfo, setBinsInfo] = useState<BinningMap>([]);
    const [clusterLabls, setClusterLabels] = useState<number[][]>([]);
    const [clickPoint, setClickPoint] = useState<[number, number] | null>(null);
    const [maxDenstyValue, setMaxDensityValue] = useState<number>(0);

    const pickedGrid = new Set<string>();


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
            render(props.binDensity, canvas, d3.interpolateMagma, props.hues);
        }
    }, [props.binDensity, props.hues]);



    return (
        <div className="canvas-container">
            <canvas id="diagram" width="1600" height="800"
                onMouseDown={(event) => {
                    setIsMouseDown(true);
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
                                if (i >= 0 && i < 1600 && j >= 0 && j < 800) {
                                    pickedGrid.add(i + ',' + (799 - j));
                                }
                            }
                        }
                    }*/
                }}
                onMouseUp={(event) => {
                    setIsMouseDown(false);
                    /*
                    setStrokePickedGrid(new Set([...strokePickedGrid, ...pickedGrid]));
                    pickedGrid.clear();
                    */
                }}
                onClick={(event) => {
                    const mouseX = event.nativeEvent.offsetX;
                    const mouseY = event.nativeEvent.offsetY;
                    setClickPoint([mouseX, mouseY]);
                }}></canvas>
            {/*<svg id="plots" style={{
                position: 'relative',
                top: '-806px',
                width: '1600px',
                height: '800px'
            }}></svg>*/}
            <svg id="interaction-renderer" style={{
                position: 'relative',
                top: '-806px',
                width: '1600px',
                height: '800px',
                pointerEvents: 'none'
            }}></svg>
        </div>
    );
}