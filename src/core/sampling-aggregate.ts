/*
 * @Author: Yumeng Xue
 * @Date: 2023-02-13 15:43:03
 * @LastEditTime: 2023-03-04 22:54:55
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/sampling-aggregate.ts
 */
import circularMDS from "./circular-MDS";
import { Hierarchical } from "./hierarchical-clustering";

function union(set1: Set<number>, set2: Set<number>): Set<number> {
    return new Set([...set1, ...set2]);
}

function getRandomSubarray(arr: any[], size: number) {
    var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }
    return shuffled.slice(min);
}

export function samplingAggregate(flattenBins: [[number, number], Set<number>][], samplingRate = 0.05, minDensity = 8): Hierarchical {
    flattenBins.sort((a, b) => b[1].size - a[1].size);
    console.log(flattenBins.length);
    const highDensityBins = flattenBins.filter(v => v[1].size >= (minDensity > 0 ? minDensity : 1));
    console.log(highDensityBins.length);
    const sampledFlattenBins = getRandomSubarray(highDensityBins, Math.floor(highDensityBins.length * samplingRate));
    const sampledBins = sampledFlattenBins.map(v => v[1]);
    console.log(sampledBins.length);
    const hc = new Hierarchical(1);

    hc.fit(sampledBins);
    return hc;
}

export function clusterDivision(hc: Hierarchical, divideNodeId: number, lineSet: Set<number>) {
    for (let i = 0; i < hc.nodes.length; i++) {
        const node = hc.nodes[i];
        if (node.id === divideNodeId) {
            const subNode1 = node.left;
            const subNode2 = node.right;
            if (subNode1 !== null && subNode2 !== null) {
                subNode1.flattenBins = [];
                subNode2.flattenBins = [];

                const flattenBins = node.flattenBins as [[number, number], Set<number>][];

                const modelCentroids: number[][] = [];
                for (const cluster of [subNode1, subNode2]) {
                    const model: number[] = new Array(lineSet.size).fill(0);
                    for (const binId of cluster.binIdList) {
                        for (const lineId of (hc.data as Set<number>[])[binId]) {
                            model[lineId] += 1;
                        }
                    }
                    modelCentroids.push(model);
                }

                modelCentroids[0] = modelCentroids[0].map(v => v / subNode1.binIdList.length);
                modelCentroids[1] = modelCentroids[1].map(v => v / subNode2.binIdList.length);
                subNode1.centroid = modelCentroids[0];
                subNode2.centroid = modelCentroids[1];

                for (const flattenBin of flattenBins) {
                    const binVector = new Array(lineSet.size).fill(0);
                    for (const lineId of flattenBin[1]) {
                        binVector[lineId] = 1;
                    }

                    const nonZero = binVector.map((v, i) => v === 0 ? null : i).filter(v => v !== null) as number[];
                    if (nonZero.map(v => Math.abs(binVector[v] - modelCentroids[0][v])).reduce((a, b) => a + b, 0)
                        < nonZero.map(v => Math.abs(binVector[v] - modelCentroids[1][v])).reduce((a, b) => a + b, 0)) {
                        subNode1.flattenBins.push(flattenBin);
                    } else {
                        subNode2.flattenBins.push(flattenBin);
                    }
                }
            }

            if (subNode1 !== null) {
                hc.nodes.push(subNode1);
            }
            if (subNode2 !== null) {
                hc.nodes.push(subNode2);
            }
            hc.nodes.splice(i, 1);
            break;
        }
    }
}

export function getNearestClusterNodeId(bin: Set<number>, hc: Hierarchical) {
    const binVector = new Array(bin.size).fill(1);
    const modelCentroids: number[][] = [];
    const lineIdMapping: { [key: number]: number } = {};

    let i = 0;
    for (const lineId of bin) {
        lineIdMapping[lineId] = i++;
    }

    for (const cluster of hc.nodes) {
        const model = new Array(bin.size).fill(0);
        for (const binId of cluster.binIdList) {
            for (const lineId of hc.data[binId]) {
                model[lineIdMapping[lineId]] += 1;
            }
        }
        modelCentroids.push(model);
    }

    for (let i = 0; i < modelCentroids.length; i++) {
        modelCentroids[i] = modelCentroids[i].map(v => v / hc.nodes[i].binIdList.length);
    }

    let minDistance = Number.MAX_VALUE;
    let minIndex = -1;
    for (let i = 0; i < modelCentroids.length; i++) {
        const nonZero = binVector.map((v, i) => v === 0 ? null : i).filter(v => v !== null) as number[];
        const distance = nonZero.map(v => Math.abs(binVector[v] - modelCentroids[i][v])).reduce((a, b) => a + b, 0);
        if (distance < minDistance) {
            minDistance = distance;
            minIndex = i;
        }
    }

    return hc.nodes[minIndex].id;
}

export function getHues(bins: Set<number>[][], hc: Hierarchical, previosHues: number[] = []): number[] {
    const hues = new Array(bins.length * bins[0].length).fill(0);
    if (hc.nodes.length <= 1) {
        const flattenBins: [[number, number], Set<number>][] = [];
        for (let i = 0; i < bins.length; i++) {
            for (let j = 0; j < bins[i].length; j++) {
                if (bins[i][j].size > 0) {
                    flattenBins.push([[i, j], bins[i][j]]);
                }
            }
        }
        hc.nodes[0].flattenBins = flattenBins;
        hc.nodes[0].hue = 0;
        return hues;
    }

    const modelCentroids: number[][] = [];
    for (const node of hc.nodes) {
        modelCentroids.push(node.centroid as number[]);
    }

    const fixItem = [];
    for (let i = 0; i < modelCentroids.length - 2; i++) {
        fixItem.push(i);
    }

    const predefinedHues = previosHues.slice();

    for (let i = previosHues.length; i < modelCentroids.length; ++i) {
        predefinedHues.push(Math.random() * 360);
    }


    const hueOfModelCentroids = circularMDS(modelCentroids, 0.1, 10000, fixItem, predefinedHues);

    for (let i = 0; i < hc.nodes.length; i++) {
        hc.nodes[i].hue = hueOfModelCentroids[i];
        const node = hc.nodes[i];
        for (const flattenBin of node.flattenBins as [[number, number], Set<number>][]) {
            hues[flattenBin[0][0] * bins[0].length + flattenBin[0][1]] = hueOfModelCentroids[i];
        }
    }

    return hues;
}