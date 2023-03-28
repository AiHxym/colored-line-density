import FlatQueue from 'flatqueue';
import { TypedFastBitSet } from 'typedfastbitset';
type MyTypedFastBitSet = TypedFastBitSet & { sizeStatic?: number };

export function intersection(set1: Set<number>, set2: Set<number>): Set<number> {
    return new Set([...set1].filter(x => set2.has(x)));
}

export function union(set1: Set<number>, set2: Set<number>): Set<number> {
    return new Set([...set1, ...set2]);
}

export function overlapCoefficientDistance(set1: MyTypedFastBitSet, set2: MyTypedFastBitSet): number {
    //return 1 - intersection(set1, set2).size / Math.min(set1.size, set2.size);
    return 1 - set1.intersection_size(set2) / Math.min((set1 as TypedFastBitSet & { sizeStatic: number }).sizeStatic, (set2 as TypedFastBitSet & { sizeStatic: number }).sizeStatic);
}

class ClusterNode {
    aggregateSet: MyTypedFastBitSet;
    left: ClusterNode | null;
    right: ClusterNode | null;
    distance: number;
    id: number;
    count: number;
    binIdList: number[];
    flattenBins: [[number, number], MyTypedFastBitSet][] | null;
    centroid: number[] | null;
    hue: number | null;
    constructor(aggregateSet: MyTypedFastBitSet, left: ClusterNode | null = null, right: ClusterNode | null = null, distance: number = -1, id: number | null = null, count: number = 1, binIdList: number[] = [], hue: number | null = null) {
        this.aggregateSet = aggregateSet;
        this.left = left;
        this.right = right;
        this.distance = distance;
        this.id = id ?? -1;
        this.count = count;
        this.binIdList = binIdList;
        this.flattenBins = null;
        this.centroid = null;
        this.hue = hue;
    }
}

export class Hierarchical {
    k: number;
    labels: number[] | null;
    data: MyTypedFastBitSet[];
    nodes: ClusterNode[];

    constructor(k: number = 1) {
        if (k <= 0) {
            throw new Error("k must be positive");
        }
        this.k = k;
        this.labels = null;
        this.data = [];
        this.nodes = [];
    }

    public fit(data: MyTypedFastBitSet[]): void {
        this.data = data;
        const n = data.length;
        const nodes: ClusterNode[] = data.map((v, i) => new ClusterNode(v, null, null, -1, i, 1, [i]));
        //const distances: Record<string, number> = {};
        if (n <= this.k) {
            this.labels = Array(n).fill(0);
            return;
        }
        const distances = new Array(n * 2 - 1).fill(0).map(() => new Array(n * 2 - 1).fill(null));
        this.labels = Array(n).fill(-1);
        let currentClustId = data.length;
        const priorityQueue = new FlatQueue<number[]>();

        for (let i = 0; i < n - 1; i++) {
            for (let j = i + 1; j < n; j++) {
                const dKey = [nodes[i].id, nodes[j].id];
                distances[nodes[i].id][nodes[j].id] = overlapCoefficientDistance(nodes[i].aggregateSet, nodes[j].aggregateSet);
                priorityQueue.push(dKey, distances[nodes[i].id][nodes[j].id]);
            }
        }

        while (nodes.length > this.k) {
            let minDist = Infinity;
            let closestPart: [number, number] = [-1, -1]; // 表示最相似的两个聚类
            while (priorityQueue.length > 0) {
                const paired = [false, false];
                minDist = priorityQueue.peekValue() as number;
                const closestPartId = priorityQueue.pop() as [number, number];
                for (let i = 0; i < nodes.length; i++) {
                    if (nodes[i].id === closestPartId[0]) {
                        paired[0] = true;
                        closestPart[0] = i;
                    } else if (nodes[i].id === closestPartId[1]) {
                        paired[1] = true;
                        closestPart[1] = i;
                    }
                }
                if (paired[0] && paired[1]) {
                    break;
                }
            }

            // 合并两个聚类
            const [part1, part2] = closestPart;
            const [node1, node2] = [nodes[part1], nodes[part2]];
            const new_node = new ClusterNode(
                //union(node1.aggregateSet, node2.aggregateSet),
                new TypedFastBitSet(),
                node1,
                node2,
                minDist,
                currentClustId,
                node1.count + node2.count,
                node1.binIdList.concat(node2.binIdList)
            );
            currentClustId += 1;
            nodes.splice(part2, 1);
            nodes.splice(part1, 1); // 一定要先del索引较大的

            for (let i = 0; i < nodes.length; i++) {
                const dKey = [nodes[i].id, new_node.id];
                let accumulateDist = 0;
                if (new_node.left !== null) {
                    let tmpDist = distances[nodes[i].id][new_node.left.id];
                    if (tmpDist === null) {
                        tmpDist = distances[new_node.left.id][nodes[i].id];
                    }
                    accumulateDist += tmpDist * nodes[i].binIdList.length * new_node.left.binIdList.length;
                }
                if (new_node.right !== null) {
                    let tmpDist = distances[nodes[i].id][new_node.right.id];
                    if (tmpDist === null) {
                        tmpDist = distances[new_node.right.id][nodes[i].id];
                    }
                    accumulateDist += tmpDist * nodes[i].binIdList.length * new_node.right.binIdList.length;
                }
                distances[nodes[i].id][new_node.id] = accumulateDist / (nodes[i].binIdList.length * new_node.binIdList.length);
                priorityQueue.push(dKey, distances[nodes[i].id][new_node.id]);
            }

            nodes.push(new_node);
        }

        this.nodes = nodes;
    }
}
