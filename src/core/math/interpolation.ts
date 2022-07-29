/*
 * @Author: Yumeng Xue
 * @Date: 2022-07-28 15:33:17
 * @LastEditTime: 2022-07-29 16:33:06
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/core/math/interpolation.ts
 */


export function interpolate1D(dataPoints: { x: number, y: number }[]): (x: number) => number {
    function binarySearch(dataPoints: { x: number, y: number }[], x: number): number {
        let [min, max] = [0, dataPoints.length - 1];
        let mid = Math.floor((min + max) / 2);
        while (min < max) {
            if (dataPoints[mid].x < x) {
                min = mid + 1;
            } else {
                max = mid;
            }
            mid = Math.floor((min + max) / 2);
        }
        return mid;
    }

    function interpolate(x: number) {
        const [min, max] = [dataPoints[0].x, dataPoints[dataPoints.length - 1].x];
        if (x < min || x > max) {
            // throw new Error(`x value ${x} is out of range [${min}, ${max}]`);
            return NaN;
        }
        const index = binarySearch(dataPoints, x);
        if (index === 0) {
            return dataPoints[0].y;
        }
        const [prevX, prevY] = [dataPoints[index - 1].x, dataPoints[index - 1].y];
        const [nextX, nextY] = [dataPoints[index].x, dataPoints[index].y];

        return prevY + (nextY - prevY) * (x - prevX) / (nextX - prevX);
    }

    return interpolate;
}