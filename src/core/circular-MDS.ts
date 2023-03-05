/*
 * @Author: Yumeng Xue
 * @Date: 2023-02-13 11:04:00
 * @LastEditTime: 2023-03-04 22:49:51
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

function calculateGradientAccurate(hues: number[], distance: number[][], dissimilarity: number[][]) {
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
                let t_hat;
                let s_hat;
                if ((Math.abs(hues[i] - hues[t]) <= 180 && hues[i] > hues[t]) || (Math.abs(hues[i] - hues[t]) > 180 && hues[i] < hues[t])) {
                    t_hat = -distance[i][t];
                    s_hat = t_hat + dissimilarity[i][t];
                } else {
                    t_hat = distance[i][t];
                    s_hat = t_hat - dissimilarity[i][t];
                }
                gradient += s_hat / s_star - t_hat / t_star;
            }
        }
        gradient *= stress;
        gradients.push(gradient);
    }

    return gradients;
}


export default function circularMDS(data: number[][], learningRate: number = 0.1, iteration: number = 10000, fixItem: number[] = [], hues: number[] = []) {
    if (hues.length === 0) {
        for (let i = 0; i < data.length; i++) {
            hues.push(Math.random() * 360);
        }
    }

    console.log(hues);
    console.log(fixItem);

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
            dissimilarity[i][j] = dissimilarity[i][j] / maxDissimilarity * Math.PI;
        }
    }

    for (let i = 0; i < iteration; i++) {
        const distance = [];
        for (let i = 0; i < data.length; i++) {
            const distanceRow = [];
            for (let j = 0; j < data.length; j++) {
                let distance = Math.abs(hues[i] - hues[j]) * Math.PI / 180;
                if (distance > Math.PI) {
                    distance = 2 * Math.PI - distance;
                }
                distanceRow.push(distance);
                //distanceRow.push(Math.sqrt(2 - 2 * Math.cos((hues[i] - hues[j]) * Math.PI / 180)));
            }
            distance.push(distanceRow);
        }
        const gradients = calculateGradientAccurate(hues, distance, dissimilarity);

        for (let j = 0; j < hues.length; j++) {
            if (fixItem.indexOf(j) === -1) {
                hues[j] -= learningRate * gradients[j];
            }
        }
    }

    for (let i = 0; i < hues.length; i++) {
        hues[i] = hues[i] % 360;
    }

    return hues;
}
