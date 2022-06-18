/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:42:21
 * @LastEditTime: 2022-06-18 17:04:21
 * @LastEditors: Yumeng Xue
 * @Description: The canvas holding for diagram drawing
 * @FilePath: /trend-mixer/src/components/Canvas.tsx
 */
import React from 'react';

export default function Canvas() {
    return (
        <div className="canvas-container">
            <canvas id="diagram" width="1600" height="800"></canvas>
        </div>
    );
}