/*
 * @Author: Yumeng Xue
 * @Date: 2023-02-13 15:43:03
 * @LastEditTime: 2023-03-14 23:31:32
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/sampling-aggregate.ts
 */
import circularMDS from "./circular-MDS";
import { Hierarchical, intersection, union, overlapCoefficientDistance } from "./hierarchical-clustering";

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

export function getHues(bins: Set<number>[][], hc: Hierarchical, previosHues: number[] = [], ifFixClusterColor: boolean[] = []): [number[], number[]] {
    //const hues = new Array(bins.length * bins[0].length).fill(0);
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
        return [[0], new Array(bins.length * bins[0].length).fill(0)];
    }

    const modelCentroids: number[][] = [];
    for (const node of hc.nodes) {
        modelCentroids.push(node.centroid as number[]);
    }

    //const fixItem = [];
    //for (let i = 0; i < modelCentroids.length - 2; i++) {
    //fixItem.push(i);
    //}

    const predefinedHues = previosHues.slice();

    for (let i = previosHues.length; i < modelCentroids.length; ++i) {
        predefinedHues.push(Math.random() * 360);
    }


    const hueOfModelCentroids = circularMDS(modelCentroids, 0.1, 10000, ifFixClusterColor, predefinedHues);
    const binClusterAssignment: number[] = new Array(bins.length * bins[0].length).fill(0);

    for (let i = 0; i < hc.nodes.length; i++) {
        hc.nodes[i].hue = hueOfModelCentroids[i];
        const node = hc.nodes[i];
        for (const flattenBin of node.flattenBins as [[number, number], Set<number>][]) {
            //hues[flattenBin[0][0] * bins[0].length + flattenBin[0][1]] = hueOfModelCentroids[i];
            binClusterAssignment[flattenBin[0][0] * bins[0].length + flattenBin[0][1]] = i;
        }
    }

    return [hueOfModelCentroids, binClusterAssignment];
}

export function getHuesAndDensitiesForClusterPicker(bins: Set<number>[][], hc: Hierarchical, lineSet: Set<number>, pickedClusters: number[]): [number[][], number[]] {
    const binDensity: number[][] = new Array(bins.length).fill(0).map(v => new Array(bins[0].length).fill(0));
    const lineImportancesDict: { [key: number]: number[] } = {}; // lineId -> importance array of all cluster
    const lineAppearancesDict: { [key: number]: number[] } = {}; // lineId -> appearance count of all cluster
    for (let lineId of lineSet) {
        lineImportancesDict[lineId] = new Array(hc.nodes.length).fill(0);
        lineAppearancesDict[lineId] = new Array(hc.nodes.length).fill(0);
    }

    for (let nodeInx = 0; nodeInx < hc.nodes.length; nodeInx++) {
        const node = hc.nodes[nodeInx];
        for (const flattenBin of node.flattenBins as [[number, number], Set<number>][]) {
            for (const lineId of flattenBin[1]) {
                lineImportancesDict[lineId][nodeInx] += flattenBin[1].size;
                lineAppearancesDict[lineId][nodeInx] += 1;
            }
        }
    }

    for (let lineId of lineSet) {
        const lineImportances = lineImportancesDict[lineId];
        const lineAppearances = lineAppearancesDict[lineId];
        for (let i = 0; i < lineImportances.length; i++) {
            //lineImportances[i] = lineImportances[i] / lineAppearances[i];
        }
    }

    const lineAllocations: { [key: number]: number } = {}; // lineId -> cluster allocation

    for (let lineId of lineSet) {
        const lineImportances = lineImportancesDict[lineId];
        let maxImportance = 0;
        let maxImportanceCluster = -1;
        for (let i = 0; i < lineImportances.length; i++) {
            if (lineImportances[i] > maxImportance) {
                maxImportance = lineImportances[i];
                maxImportanceCluster = i;
            }
        }
        lineAllocations[lineId] = maxImportanceCluster;
    }
    //console.log(lineAllocations);

    const lineSetsForPickedClusters = new Array(pickedClusters.length).fill(0).map(v => new Set<number>());
    for (let i = 0; i < pickedClusters.length; i++) {
        const pickedCluster = pickedClusters[i];
        for (let lineId of lineSet) {
            if (lineAllocations[lineId] === pickedCluster) {
                lineSetsForPickedClusters[i].add(lineId);
            }
        }
    }

    const binClusterAssignment: number[] = new Array(bins.length * bins[0].length).fill(0);

    for (let i = 0; i < bins.length; i++) {
        for (let j = 0; j < bins[i].length; j++) {
            const bin = bins[i][j];
            let minDistance = Infinity;
            for (let k = 0; k < lineSetsForPickedClusters.length; k++) {
                const lineSet = lineSetsForPickedClusters[k];
                if (overlapCoefficientDistance(bin, lineSet) < minDistance) {
                    binClusterAssignment[i * bins[0].length + j] = pickedClusters[k];
                    binDensity[i][j] = intersection(bin, lineSet).size;
                    minDistance = overlapCoefficientDistance(bin, lineSet);
                }
            }
        }
    }
    const binDensityMax = Math.max(...binDensity.map(v => Math.max(...v)));
    for (let i = 0; i < bins.length; i++) {
        for (let j = 0; j < bins[i].length; j++) {
            binDensity[i][j] /= binDensityMax;
        }
    }


    // const lineSets = [];
    // for (let nodeInx = 0; nodeInx < hc.nodes.length; nodeInx++) {
    //     const node = hc.nodes[nodeInx];
    //     if (pickedClusters.indexOf(nodeInx) === -1) {
    //         continue;
    //     }
    //     const lineSet = new Set<number>();
    //     for (const flattenBin of node.flattenBins as [[number, number], Set<number>][]) {
    //         for (const lineId of flattenBin[1]) {
    //             lineSet.add(lineId);
    //         }
    //     }
    //     lineSets.push(lineSet);
    // }

    // console.log(lineSets);

    // const binClusterAssignment: number[] = new Array(bins.length * bins[0].length).fill(0);

    // for (let i = 0; i < bins.length; i++) {
    //     for (let j = 0; j < bins[i].length; j++) {
    //         const bin = bins[i][j];
    //         let minDistance = Infinity;
    //         for (let k = 0; k < lineSets.length; k++) {
    //             const lineSet = lineSets[k];
    //             if (overlapCoefficientDistance(bin, lineSet) < minDistance) {
    //                 binClusterAssignment[i * bins[0].length + j] = pickedClusters[k];
    //                 binDensity[i][j] = intersection(bin, lineSet).size;
    //                 minDistance = overlapCoefficientDistance(bin, lineSet);
    //             }
    //         }
    //     }
    // }
    // const binDensityMax = Math.max(...binDensity.map(v => Math.max(...v)));
    // for (let i = 0; i < bins.length; i++) {
    //     for (let j = 0; j < bins[i].length; j++) {
    //         binDensity[i][j] /= binDensityMax;
    //     }
    // }

    return [binDensity, binClusterAssignment];
}