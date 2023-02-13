/*
 * @Author: Yumeng Xue
 * @Date: 2023-02-13 11:04:00
 * @LastEditTime: 2023-02-13 11:09:13
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
            if (i !== t && distance[i][t] !== 0) {
                gradient += ((distance[i][t] - dissimilarity[i][t]) / distance[i][t] * s_star - 1 / t_star) * Math.sin((hues[t] - hues[i]) * Math.PI / 180);
            }
        }

        gradient *= stress;
        gradients.push(gradient);
    }

    return gradients;
}

export default function circularMDS(data: number[][], learningRate: number = 0.001, iteration: number = 500) {
    let hues = [];
    for (let i = 0; i < data.length; i++) {
        hues.push(Math.random() * 360);
    }
    let dissimilarity = [];
    for (let i = 0; i < data.length; i++) {
        let dissimilarityRow = [];
        for (let j = 0; j < data.length; j++) {
            dissimilarityRow.push(Math.sqrt((data[i][0] - data[j][0]) ** 2 + (data[i][1] - data[j][1]) ** 2));
        }
        dissimilarity.push(dissimilarityRow);
    }

    let distance = [];
    for (let i = 0; i < data.length; i++) {
        let distanceRow = [];
        for (let j = 0; j < data.length; j++) {
            distanceRow.push(Math.sqrt((data[i][0] - data[j][0]) ** 2 + (data[i][1] - data[j][1]) ** 2));
        }
        distance.push(distanceRow);
    }

    for (let i = 0; i < iteration; i++) {
        let gradients = calculateGradient(hues, distance, dissimilarity);
        for (let j = 0; j < hues.length; j++) {
            hues[j] -= learningRate * gradients[j];
        }
    }

    for (let i = 0; i < hues.length; i++) {
        hues[i] = hues[i] % 360;
    }

    return hues;
}
