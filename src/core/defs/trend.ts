import { Line } from "./line";

/**
 * @param support: the number of time series that are part of the trend
 * @param duration: the length of the time interval during which the time series behave similarly
 * @param range: the interval between the highest valued and lowest valued time series in the trend
 * @param distribution: the time series that exactly making up the trend lie within the range of the trend
 */
export interface Trend {
    support: number;
    duration: [number, number];
    range: [number, number];
    distribution: Line[];
}