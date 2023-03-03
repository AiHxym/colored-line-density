/*
 * @Author: Yumeng Xue
 * @Date: 2023-02-13 11:04:00
 * @LastEditTime: 2023-03-03 19:40:20
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/circular-MDS.ts
 */
function calculateGradient(hues: number[], distance: number[][], dissimilarity: number[][]) {
    let s_star = 0;
    let t_star = 0;

    for (let i = 0; i < distance.length; i++) {
        for (let j = 0; j < i; j++) {
            s_star += (distance[i][j] - dissimilarity[i][j]) ** 2;
            t_star += distance[i][j] ** 2;
        }
    }

    let stress = Math.sqrt(s_star / t_star);

    let gradients = [];

    for (let t = 0; t < hues.length; t++) {
        let gradient = 0;
        for (let i = 0; i < hues.length; i++) {
            if (distance[i][t] !== 0) {
                gradient += ((distance[i][t] - dissimilarity[i][t]) / (distance[i][t] * s_star) - 1 / t_star) * Math.sin((hues[t] - hues[i]) * Math.PI / 180);
            }
        }

        gradient *= stress;
        gradients.push(gradient);
    }

    return gradients;
}

export default function circularMDS(data: number[][], learningRate: number = 0.1, iteration: number = 10000) {
    const hues = [];
    for (let i = 0; i < data.length; i++) {
        hues.push(Math.random() * 360);
    }
    const dissimilarity = [];
    for (let i = 0; i < data.length; i++) {
        const dissimilarityRow = [];
        for (let j = 0; j < data.length; j++) {
            dissimilarityRow.push(Math.sqrt(data[i].map((d, k) => (d - data[j][k]) ** 2).reduce((a, b) => a + b)));
        }
        dissimilarity.push(dissimilarityRow);
    }

    const maxDissimilarity = Math.max(...dissimilarity.map(d => Math.max(...d)));
    for (let i = 0; i < dissimilarity.length; i++) {
        for (let j = 0; j < dissimilarity.length; j++) {
            dissimilarity[i][j] = dissimilarity[i][j] / maxDissimilarity * 2;
        }
    }

    console.log(dissimilarity);

    for (let i = 0; i < iteration; i++) {
        const distance = [];
        for (let i = 0; i < data.length; i++) {
            const distanceRow = [];
            for (let j = 0; j < data.length; j++) {
                distanceRow.push(Math.sqrt(2 - 2 * Math.cos((hues[i] - hues[j]) * Math.PI / 180)));
            }
            distance.push(distanceRow);
        }
        console.log(distance);

        const gradients = calculateGradient(hues, distance, dissimilarity);
        for (let j = 0; j < hues.length; j++) {
            console.log(gradients[j]);
            hues[j] -= learningRate * gradients[j];
        }
    }

    for (let i = 0; i < hues.length; i++) {
        hues[i] = hues[i] % 360;
    }

    return hues;
}
