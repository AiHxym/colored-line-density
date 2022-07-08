/*
 * @Author: Yumeng Xue
 * @Date: 2022-05-18 15:36:31
 * @LastEditTime: 2022-07-08 12:52:03
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/kde.ts
 */

function gaussianKernel(x: number, sigma: number) {
    return Math.exp(-x * x / (2 * sigma * sigma)) / (Math.sqrt(2 * Math.PI) * sigma);
}

function KDE(x: number, data: number[], bandwidth: number) {
    let sigma = 1;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += gaussianKernel((x - data[i]) / bandwidth, sigma);
    }
    return sum / data.length / bandwidth;
}

export function getMaximum(data: number[], bandwidth: number) {
    for (let i = 0; i < data.length; i++) {
        data[i] = Math.atan(data[i]) / (Math.PI / 2);
    }
    let max = 0;
    let maxPoint = -1;
    for (let x = -100; x <= 100; ++x) {
        const tempMax = Math.max(max, KDE(x / 100, data, bandwidth));
        if (tempMax > max) {
            maxPoint = x / 100;
            max = tempMax;
        }
    }
    return maxPoint;
}

export function getKDE(data: number[], bandwidth: number) {
    let estimate = [];
    for (let x = 0; x <= 100; ++x) {
        estimate.push({ x: x / 100, y: KDE(x / 100, data, bandwidth) });
    }

    const peaks = [];
    for (let i = 0; i < estimate.length; ++i) {
        if (i > 0 && i < estimate.length - 1) {
            if (estimate[i].y > estimate[i - 1].y && estimate[i].y > estimate[i + 1].y) {
                peaks.push(i);
            }
        } else if (i === 0) {
            if (estimate[i].y > estimate[i + 1].y) {
                peaks.push(i);
            }
        } else {
            if (estimate[i].y > estimate[i - 1].y) {
                peaks.push(i);
            }
        }
    }
    return { estimate, peaks };
}