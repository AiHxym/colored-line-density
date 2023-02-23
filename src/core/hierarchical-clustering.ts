import FlatQueue from 'flatqueue';

function intersection(set1: Set<number>, set2: Set<number>): Set<number> {
    return new Set([...set1].filter(x => set2.has(x)));
}

function union(set1: Set<number>, set2: Set<number>): Set<number> {
    return new Set([...set1, ...set2]);
}

function overlapCoefficientDistance(set1: Set<number>, set2: Set<number>): number {
    return 1 - intersection(set1, set2).size / Math.min(set1.size, set2.size);
}

class ClusterNode {
    aggregateSet: Set<number>;
    left: ClusterNode | null;
    right: ClusterNode | null;
    distance: number;
    id: number;
    count: number;
    binIdList: number[];
    flattenBins: [[number, number], Set<number>][] | null;
    centroid: number[] | null;
    constructor(aggregateSet: Set<number>, left: ClusterNode | null = null, right: ClusterNode | null = null, distance: number = -1, id: number | null = null, count: number = 1, binIdList: number[] = []) {
        this.aggregateSet = aggregateSet;
        this.left = left;
        this.right = right;
        this.distance = distance;
        this.id = id ?? -1;
        this.count = count;
        this.binIdList = binIdList;
        this.flattenBins = null;
        this.centroid = null;
    }
}

export class Hierarchical {
    k: number;
    labels: number[] | null;
    data: Set<number>[];
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

    public fit(data: Set<number>[]): void {
        this.data = data;
        const n = data.length;
        const nodes: ClusterNode[] = data.map((v, i) => new ClusterNode(v, null, null, -1, i, 1, [i]));
        const distances: Record<string, number> = {};
        this.labels = Array(n).fill(-1);
        let currentClustId = -1;
        const priorityQueue = new FlatQueue<number[]>();
        for (let i = 0; i < n - 1; i++) {
            for (let j = i + 1; j < n; j++) {
                const dKey = [nodes[i].id, nodes[j].id];
                const dKeyStr = `${nodes[i].id},${nodes[j].id}`;
                distances[dKeyStr] = overlapCoefficientDistance(nodes[i].aggregateSet, nodes[j].aggregateSet);
                priorityQueue.push(dKey, distances[dKeyStr]);
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
                new Set(),
                node1,
                node2,
                minDist,
                currentClustId,
                node1.count + node2.count,
                node1.binIdList.concat(node2.binIdList)
            );
            currentClustId -= 1;
            nodes.splice(part2, 1);
            nodes.splice(part1, 1); // 一定要先del索引较大的

            for (let i = 0; i < nodes.length; i++) {
                const dKey = [nodes[i].id, new_node.id];
                const dKeyStr = `${nodes[i].id},${new_node.id}`;
                let accumulateDist = 0;
                if (new_node.left !== null) {
                    let subDKeyStr = `${nodes[i].id},${new_node.left.id}`;
                    if (!(subDKeyStr in distances)) {
                        subDKeyStr = `${new_node.left.id},${nodes[i].id}`;
                    }
                    accumulateDist += distances[subDKeyStr] * nodes[i].binIdList.length * new_node.left.binIdList.length;
                }
                if (new_node.right !== null) {
                    let subDKeyStr = `${nodes[i].id},${new_node.right.id}`;
                    if (!(subDKeyStr in distances)) {
                        subDKeyStr = `${new_node.right.id},${nodes[i].id}`;
                    }
                    accumulateDist += distances[subDKeyStr] * nodes[i].binIdList.length * new_node.right.binIdList.length;
                }
                distances[dKeyStr] = accumulateDist / (nodes[i].binIdList.length * new_node.binIdList.length);
                priorityQueue.push(dKey, distances[dKeyStr]);
            }

            nodes.push(new_node);
        }

        this.nodes = nodes;
    }
}
