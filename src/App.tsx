/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:36:59
 * @LastEditTime: 2023-03-28 03:23:47
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/App.tsx
 */
import React, { useState, useEffect } from 'react';
import { TypedFastBitSet } from 'typedfastbitset';
import 'antd/dist/antd.min.css';
import {
  Button, InputNumber, Layout, Select, Divider,
  Row, Col, Slider, Upload, Checkbox, CheckboxOptionType, Tooltip
} from "antd";
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import Canvas from './components/Canvas';
import papa from 'papaparse';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import * as d3 from 'd3';

import './App.css';
import { BinningMap, binning } from './core/binning';
import { samplingAggregate, clusterDivision, clusterDivisionByClusterNum, getNearestClusterNodeId, getHues, getHuesAndDensitiesForClusterPicker } from './core/sampling-aggregate'
import { Hierarchical } from './core/hierarchical-clustering'

const { Header, Footer, Sider, Content } = Layout;
const { Option } = Select;

let a1 = 360 * 0.05;  // i, L, I
let a2 = 360 * 0.22;  // L
let a3 = 360 * 0.26;  // V, Y, X
let a4 = 360 * 0.50;  // T
let hueTemplates: { [key: string]: number[] } = {};
hueTemplates['N-Type'] = [360, 360];  // center
hueTemplates['i-Type'] = [360, a1];  // center, range
hueTemplates['V-Type'] = [360, a3];
hueTemplates['T-Type'] = [360, a4];
hueTemplates['L-Type'] = [360, 90, a1, a2];  // centers *2 & ranges *2
hueTemplates['Lm-Type'] = [360, 270, a1, a2];
hueTemplates['I-Type'] = [360, 180, a1, a1];
hueTemplates['Y-Type'] = [360, 180, a3, a1];
hueTemplates['X-Type'] = [360, 180, a3, a3];

const hueMapping = (C: number, R: number, init_H: number[]) => {
  let sigma = 1;
  let new_H = new Array(init_H.length).fill(0);
  init_H.forEach((h, i) => {
    let d = C - h;
    let flag = true;
    let x = d;
    if (d < 0 && Math.abs(d) > 180) { x = 360 - Math.abs(d); }  // angle restrict within 180
    if (d >= 0 && Math.abs(d) > 180) { x = 360 - Math.abs(d); flag = false; }
    if (d >= 0 && Math.abs(d) <= 180) { x = d; }
    if (d < 0 && Math.abs(d) <= 180) { flag = false; }
    if (Math.abs(x) <= R / 2) { new_H[i] = h; }
    else {
      x = x / 180;
      let gaussian = Math.exp(-Math.pow((x) / sigma, 2.0) / 2.0) / Math.sqrt(2 * Math.PI);
      let shift = Math.floor((1 - gaussian) * R / 2);
      // console.log('shift:', shift)
      if (flag) { new_H[i] = (C - shift + 360) % 360; }
      else { new_H[i] = (C + shift) % 360; }
    }
  })
  // console.log(new_H)
  return new_H;
}

const getHueInTemplates = (C: number[], R: number[], init_H: number[]) => {
  // only one sector
  if (C.length === 1) {
    return hueMapping(C[0], R[0], init_H);
  }
  // two sectors
  else {
    let sector1: number[] = [];
    let sector2: number[] = [];
    let indexes: number[] = [];
    // split by distances to the centers of each sector
    init_H.forEach((h, i) => {
      let d1 = Math.abs(C[0] - h);
      let d2 = Math.abs(C[1] - h);
      if (d1 > 180) { d1 = 360 - d1; }
      if (d2 > 180) { d2 = 360 - d2; }
      if (d1 <= d2) { sector1.push(h); indexes.push(0); }
      else { sector2.push(h); indexes.push(1); }
    })
    // hue mapping for each sector
    let sector1_h = hueMapping(C[0], R[0], sector1);
    let sector2_h = hueMapping(C[1], R[1], sector2);
    let new_H = new Array(init_H.length).fill(0);
    indexes.forEach((idx, i) => {
      if (idx === 0) { new_H[i] = sector1_h.shift(); }
      else { new_H[i] = sector2_h.shift(); }
    })
    return new_H;
  }
}

function argMax(arr: number[]) {
  if (arr.length === 0) {
    return -1;
  }

  var max = arr[0];
  var maxIndex = 0;

  for (var i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      maxIndex = i;
      max = arr[i];
    }
  }

  return maxIndex;
}

function downloadCSV(lines: { lineId: number, times?: number[], xValues: number[], yValues: number[] }[]) {

  const dataArrary: { lineId: number, time?: number, x: number, y: number }[] = [];
  lines.forEach((line, i) => {
    if (line.times) {
      line.times.forEach((time, j) => {
        dataArrary.push({ lineId: line.lineId, time, x: line.xValues[j], y: line.yValues[j] });
      })
    } else {
      line.xValues.forEach((x, j) => {
        dataArrary.push({ lineId: line.lineId, x, y: line.yValues[j] });
      })
    }
  });
  const csv = papa.unparse(dataArrary);

  const csvData = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const csvURL = window.URL.createObjectURL(csvData);

  const tempLink = document.createElement('a');
  tempLink.href = csvURL;
  tempLink.setAttribute('download', 'download.csv');
  tempLink.click();
}


function App() {
  const [lines, setLines] = useState<{ times?: number[], xValues: number[], yValues: number[] }[]>([]);
  const [hues, setHues] = useState<number[]>([]);
  const [binDensity, setBinDensity] = useState<{ [key: number]: [[number, number], number][] }>([]);
  const [binSize, setBinSize] = useState<number>(1);
  const [canvasWidth, setCanvasWidth] = useState<number>(1000);
  const [canvasHeight, setCanvasHeight] = useState<number>(500);
  const [hueCenters, setHueCenters] = useState<number[]>([]);
  const [binsInfo, setBinsInfo] = useState<BinningMap>([]);
  const [hueTemplateType, setHueTemplateType] = useState<string>('N-Type');
  const [hueTemplateRotation, setHueTemplateRotation] = useState<number>(0);
  const [hueTemplateDomain, setHueTemplateDomain] = useState<number[]>(Array.from(Array(360), (_, i) => i));
  const [clusterOptions, setClusterOptions] = useState<(string | number | CheckboxOptionType)[]>([]);
  //const [ifShowedCluster, setIfShowedCluster] = useState<boolean[]>([]);
  const [ifFixClusterColor, setIfFixClusterColor] = useState<boolean[]>([]);
  const [checkboxState, setCheckboxState] = useState<CheckboxValueType[]>([]);
  const [clusterPickerCheckboxState, setClusterPickerCheckboxState] = useState<CheckboxValueType[]>([]);
  const [binClusterAssignment, setBinClusterAssignment] = useState<number[]>([]);
  const [hc, setHC] = useState<Hierarchical | undefined>(undefined);
  const [lineSet, setLineSet] = useState<Set<number>>(new Set());
  const [samplingRate, setSamplingRate] = useState<number>(0.001);
  const [displaySamplingRate, setDisplaySamplingRate] = useState<number>(0.2);
  const [maxDensityValue, setMaxDensityValue] = useState<number>(0);
  const [minDensity, setMinDensity] = useState<number>(0);
  const [minDisplayDensity, setMinDisplayDensity] = useState<number>(0);
  const [sampledBinNum, setSampledBinNum] = useState<number>(0);
  const [pickedBinDensity, setPickedBinDensity] = useState<number[][]>([]);
  const [pickedHues, setPickedHues] = useState<number[]>([]);
  const [initClusterNum, setInitClusterNum] = useState<number>(0);
  const [lineSetsForPickedClusters, setLineSetsForPickedClusters] = useState<TypedFastBitSet[]>([]);

  useEffect(() => { // update drawing when clusterPickerCheckboxState changed
    //console.log(clusterPickerCheckboxState);
  }, [clusterPickerCheckboxState])

  useEffect(() => { // update checkboxState
    const newCheckboxState = [];
    for (let i = 0; i < hueCenters.length; i++) {
      if (ifFixClusterColor[i]) {
        newCheckboxState.push(i);
      }
    }
    setCheckboxState(newCheckboxState);
  }, [hueCenters, ifFixClusterColor])

  useEffect(() => {
    const newHues = [];
    for (let i = 0; i < binClusterAssignment.length; i++) {
      if (binClusterAssignment[i] < hueCenters.length) {
        newHues.push(hueCenters[binClusterAssignment[i]]);
      }
    }
    setHues(newHues);

    const newClusterOptions = [];
    //const newIfFixClusterColor = [];
    for (let i = 0; i < hueCenters.length; i++) {
      newClusterOptions.push({
        label: '',
        value: i
      });
      // newIfFixClusterColor.push(false);
    }
    setClusterOptions(newClusterOptions);

  }, [binClusterAssignment, hueCenters])

  useEffect(() => {
    let totalBins = 0;
    for (const [denstiy, flattenBins] of Object.entries(binDensity)) {
      if (parseInt(denstiy) >= minDisplayDensity) {
        totalBins += flattenBins.length;
      }
    }
    setSampledBinNum(Math.floor(totalBins * displaySamplingRate));
  }, [binDensity, displaySamplingRate, minDisplayDensity]);

  useEffect(() => {
    console.log('lines changed');
    const bins = binning(lines, { start: 0, stop: canvasWidth, step: binSize }, { start: 0, stop: canvasHeight, step: binSize });
    setBinsInfo(bins);
    //console.log('bins:', bins);

    const binDensityMax = Math.max(...bins.map(binCol => Math.max(...binCol.map(bin => bin.size()))));
    //console.log('binDensityMax:', binDensityMax);

    const newBinDensity: { [key: number]: [[number, number], number][] } = {};
    const flattenBins: [[number, number], TypedFastBitSet][] = [];
    for (let i = 0; i < bins.length; i++) {
      for (let j = 0; j < bins[i].length; j++) {
        flattenBins.push([[i, j], bins[i][j]]);
        if (!newBinDensity[bins[i][j].size()]) {
          newBinDensity[bins[i][j].size()] = [];
        }
        newBinDensity[bins[i][j].size()].push([[i, j], bins[i][j].size() / binDensityMax]);
      }
    }
    newBinDensity[0] = [];

    setBinDensity(newBinDensity);
    setMaxDensityValue(binDensityMax);
    console.time("build hierarchical clustering");
    const hc = samplingAggregate(flattenBins, samplingRate, minDensity);
    console.timeEnd("build hierarchical clustering");
    if (hc.nodes.length === 0) {
      return;
    }
    setHC(hc);
    const [newHueCenters, newBinClusterAssignment] = getHues(bins, hc);
    setHueCenters(newHueCenters);
    setBinClusterAssignment(newBinClusterAssignment);
    //setHues(hues);

  }, [binSize, canvasHeight, canvasWidth, lines, minDensity, samplingRate]);


  useEffect(() => {
    if (hueTemplateType !== 'N-Type') {
      let singleSector = ['i-Type', 'V-Type', 'T-Type'];
      let doubleSectors = ['L-Type', 'Lm-Type', 'I-Type', 'Y-Type', 'X-Type'];
      let ht = hueTemplates[hueTemplateType];
      let centers: number[] = []; // centers of each sector
      let init_c: number[] = [];  // store initial centers
      let starts: number[] = [];  // starting hue of each sector
      let ranges: number[] = [];  // ranges of each sector
      let newDomain: number[] = [];
      // let rotation = 0; // rotation of the template
      if (singleSector.includes(hueTemplateType)) {
        centers = [Math.floor(ht[0])];
        init_c = centers;
        starts = [(Math.floor(ht[0] - ht[1] / 2)) % 360];
        ranges = [Math.floor(ht[1])];
        newDomain = new Array(ranges[0]).fill(0).map((_, index) => (starts[0] + index) % 360); // start, ..., start+range
      }
      else if (doubleSectors.includes(hueTemplateType)) {
        centers = [Math.floor(ht[0]), Math.floor(ht[1])];
        init_c = centers;
        starts = [(Math.floor(ht[0] - ht[2] / 2)) % 360,
        (Math.floor(ht[1] - ht[3] / 2)) % 360];
        ranges = [Math.floor(ht[2]), Math.floor(ht[3])];
        let d1 = new Array(ranges[0]).fill(0).map((_, index) => (starts[0] + index) % 360);
        let d2 = new Array(ranges[1]).fill(1).map((_, index) => (starts[1] + index) % 360);
        newDomain = d1.concat(d2);
      }
      // update hueTemplateDomain
      setHueTemplateRotation(0);
      setHueTemplateDomain(newDomain);
      // hue mapping
      setHueCenters(getHueInTemplates(centers, ranges, hueCenters));
    }
  }, [hueTemplateType]);

  useEffect(() => {
    // Data
    const bar_max = 10;
    const bar_min = 1;
    const ring_width = 3;
    const gap = 0.2;
    const color_C = 120;
    const color_L = 55;
    let hue = new Array(360).fill(0).map((i, index) => index); // 0~359

    let hueCount = new Array(360).fill(0);
    hues.forEach((h, i) => {
      if (binsInfo[Math.floor(i / binsInfo[0].length)][i % binsInfo[0].length].size() > 0) {
        ++hueCount[Math.floor(h)];
      }
    });
    let hueCountMax = Math.max(...hueCount);

    //console.log(hueCount);


    let bar = hueCount.map(v => Math.floor(v / hueCountMax * (bar_max - bar_min)) + bar_min);
    //bar = new Array(360).fill(1).map(i => Math.floor(Math.random() * (bar_max - bar_min)) + bar_min);



    //console.log(bar);

    // dimensions and margins of the graph
    let margin = { top: 0, right: 0, bottom: 0, left: 0 },
      width = 300 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom,
      innerRadius = 120,
      outerRadius = Math.min(width, height) / 2;   // the outerRadius goes from the middle of the SVG area to the border

    // console.log(width)
    // console.log(height)
    // console.log(innerRadius)
    // console.log(outerRadius)

    d3.selectAll('#hue-picker > svg').remove();

    // SVG object
    let svg = d3.select("#hue-picker")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + (width / 2 + margin.left) + "," + (height / 2 + margin.top) + ")");


    // X scale
    let x = d3.scaleBand()
      .range([0, 2 * Math.PI])    // X axis goes from 0 to 2pi = all around the circle. If I stop at 1Pi, it will be around a half circle
      .align(0)                   // This does nothing
      .domain(hue.map(h => h.toString()));               // The domain of the X axis is the list of states.

    // Y scale outer variable
    let y = d3.scaleRadial()
      .range([innerRadius, outerRadius])   // Domain will be define later.
      .domain([0, bar_max]); // Domain of Y is from 0 to the max seen in the data

    // Second barplot Scales
    let ybis = d3.scaleRadial()
      .range([innerRadius, 5])   // Domain will be defined later.
      .domain([0, 10]);

    // console.log(y(ring_width))

    // Add the bars
    svg.append("g")
      .selectAll("path")
      .data(hue)
      .enter()
      .append("path")
      .attr("fill", (i) => d3.hcl(hue[i], color_C, color_L).formatHex())
      .attr("class", "yo")
      .attr("d", d3.arc()     // imagine your doing a part of a donut plot
        .innerRadius(innerRadius)
        .outerRadius(function () { return y(ring_width); })
        .startAngle((i: any) => x(hue[i].toString()) as number)
        .endAngle((i: any) => x(hue[i].toString()) as number + x.bandwidth())
        .padAngle(0.0)
        .padRadius(innerRadius) as any);

    // Add the second series
    svg.append("g")
      .selectAll("path")
      .data(bar)
      .enter()
      .append("path")
      .attr("fill", (i, index) => d3.hcl(index, color_C, color_L).formatHex())
      .attr("d", d3.arc()     // imagine your doing a part of a donut plot
        .innerRadius((i) => ybis(gap))
        .outerRadius((i) => ybis(i as unknown as number))
        .startAngle((i, index) => x(index.toString()) as number)
        .endAngle((i, index) => x(index.toString()) as number + x.bandwidth())
        .padAngle(0.0)
        .padRadius(innerRadius) as any)

    // Hue Templates
    // TODO: duplicated codes
    if (hueTemplateType !== 'N-Type') {
      let singleSector = ['i-Type', 'V-Type', 'T-Type'];
      let doubleSectors = ['L-Type', 'Lm-Type', 'I-Type', 'Y-Type', 'X-Type'];
      let ht = hueTemplates[hueTemplateType];
      let centers: number[] = []; // centers of each sector
      let init_c: number[] = [];  // store initial centers
      let starts: number[] = [];  // starting hue of each sector
      let ranges: number[] = [];  // ranges of each sector
      let newDomain: number[] = [];
      let init_mx = 0;  // store initial mouse pos for every drag
      let init_my = 0;
      // let rotation = 0; // rotation of the template
      if (singleSector.includes(hueTemplateType)) {
        centers = [Math.floor(ht[0])];
        init_c = centers;
        starts = [(Math.floor(ht[0] - ht[1] / 2)) % 360];
        ranges = [Math.floor(ht[1])];
        newDomain = new Array(ranges[0]).fill(0).map((_, index) => (starts[0] + index) % 360); // start, ..., start+range
      }
      else if (doubleSectors.includes(hueTemplateType)) {
        centers = [Math.floor(ht[0]), Math.floor(ht[1])];
        init_c = centers;
        starts = [(Math.floor(ht[0] - ht[2] / 2)) % 360,
        (Math.floor(ht[1] - ht[3] / 2)) % 360];
        ranges = [Math.floor(ht[2]), Math.floor(ht[3])];
        let d1 = new Array(ranges[0]).fill(0).map((_, index) => (starts[0] + index) % 360);
        let d2 = new Array(ranges[1]).fill(1).map((_, index) => (starts[1] + index) % 360);
        newDomain = d1.concat(d2);
      }

      // draw the template to drag and rotate
      svg.append("g")
        .selectAll("path")
        .data(starts)
        .enter()
        .append("path")
        .attr("fill", "gray")
        .attr("fill-opacity", 0.5)
        .attr("class", "hue-template")
        .attr("d", d3.arc()
          .innerRadius(0)
          .outerRadius(ybis(gap))
          .startAngle((i, index) => x((i as unknown as number).toString()) as number)
          .endAngle((i, index) => x((i as unknown as number).toString()) as number + x.bandwidth() * ranges[index])
          .padAngle(0.0) as any)
        .attr('transform', 'rotate(' + hueTemplateRotation + ')')
        .call(d3.drag()
          .on("start", function (e) {
            d3.selectAll(".hue-template").attr("fill-opacity", 0.3);
            init_mx = e.x;
            init_my = e.y;
          })
          .on("drag", function (e) {
            let ex = e.x;
            let ey = e.y;
            let angle = getAngle(init_mx, init_my, ex, ey);
            let rotation_temp = (hueTemplateRotation + angle) % 360;
            d3.selectAll(".hue-template").attr('transform', 'rotate(' + rotation_temp + ')');
          })
          .on("end", function (e) {
            d3.selectAll(".hue-template").attr("fill-opacity", 0.5);
            let ex = e.x;
            let ey = e.y;
            let angle = getAngle(init_mx, init_my, ex, ey);
            angle = Math.floor(angle);
            let rotation = (hueTemplateRotation + angle) % 360;
            setHueTemplateRotation(rotation);
            // hueTemplateRotation = rotation;
            centers = centers.map((i, index) => (init_c[index] + rotation) % 360)
            // update hueTemplateDomain
            newDomain = hueTemplateDomain.map((h) => (h + angle) % 360);
            setHueTemplateDomain(newDomain);
            // hueTemplateDomain = newDomain;;
            // hue mapping
            setHueCenters(getHueInTemplates(centers, ranges, hueCenters));
          }) as any
        )
        .style("cursor", "pointer");
    }


    // Circle
    const radius = (y(ring_width) - innerRadius) / 2
    const pos_radius = innerRadius + radius
    svg.append("g")
      .selectAll("path")
      .data(hueCenters.map((v, index) => index))  /// ID of circles
      .enter()
      .append("circle")
      .attr("r", radius)
      .attr("fill", "black")
      .attr("cx", i => Math.sin(hueCenters[i] * Math.PI / 180) * pos_radius)
      .attr("cy", i => -Math.cos(hueCenters[i] * Math.PI / 180) * pos_radius)
      .attr("fill-opacity", 0.8)
      .attr("id", i => "hue-center" + i)
      .attr("visibility", i => ifFixClusterColor[i] ? "hidden" : "visible")
      // draging interaction
      .call(d3.drag()
        .on("start", function (e) {
          d3.select(this).attr("fill-opacity", 0.4);
        })
        .on("drag", function (e) {
          // d3.select(this).attr("cx", d3.event.x).attr("cy", d3.event.y);
          let ex = e.x;
          let ey = e.y;
          let current_hue = getHueByPos(ex, ey);
          if (!hueTemplateDomain.includes(current_hue)) {
            let dis = hueTemplateDomain.map((h) => Math.abs(h - current_hue));
            let idx = dis.findIndex((d, i) => { return d === Math.min(...dis) });
            current_hue = hueTemplateDomain[idx];
          }
          let new_y = -Math.cos(current_hue * Math.PI / 180) * pos_radius;
          let new_x = Math.sin(current_hue * Math.PI / 180) * pos_radius;
          d3.select(this).attr("cx", new_x).attr("cy", new_y);
        })
        .on("end", function (e) {
          d3.select(this).attr("fill-opacity", 0.8);
          let ex = e.x;
          let ey = e.y;
          let current_hue = getHueByPos(ex, ey);
          let point_id = parseInt(d3.select(this).attr("id").replace("hue-center", ""));
          setHueCenters(hueCenters.map((v, index) => index === point_id ? current_hue : v));
          //console.log(current_hue);
          return current_hue;
        }) as any
      )
      // .call(drag)
      .style("cursor", "pointer");

    const getAngle = (x1: number, y1: number, x2: number, y2: number) => {
      const dot = x1 * x2 + y1 * y2;
      const det = x1 * y2 - y1 * x2;
      const angle = Math.atan2(det, dot) / Math.PI * 180;
      return (angle + 360) % 360;
    }

    const getHueByPos = (X: number, Y: number) => getAngle(0, -100, X, Y)
  }, [hueCenters, hues, binDensity, hueTemplateType, hueTemplateRotation, hueTemplateDomain, binsInfo, ifFixClusterColor]);


  // useEffect(() => {
  //   ifFixClusterColor.forEach((fix, i) => {
  //     if (fix) {
  //       d3.select('#hue-center' + i).attr('visibility', 'hidden')
  //     }
  //     else {
  //       d3.select('#hue-center' + i).attr('visibility', 'visible')
  //     }
  //   })
  // }, [ifFixClusterColor])

  useEffect(() => {
    const color_C = 120;
    const color_L = 55;
    let checkboxColors = hueCenters.map((h) => d3.hcl(h, color_C, color_L).formatHex());

    let cluster_checkbox = document.getElementById('cluster-checkbox');
    cluster_checkbox?.childNodes.forEach((n) => {
      n.childNodes.forEach((n, i) => {
        (n as HTMLElement).style.setProperty("--background-color", checkboxColors[i]);
        (n as HTMLElement).style.setProperty("--border-color", checkboxColors[i]);
        const checkBoxInner = (n as HTMLElement).childNodes[0].childNodes[1] as HTMLElement;
        if (checkBoxInner !== undefined) {
          checkBoxInner.style.setProperty("background-color", checkboxColors[i]);
          checkBoxInner.style.setProperty("border-color", checkboxColors[i]);
        }
      });
    });

    let clusterPickerCheckbox = document.getElementById('cluster-picker-checkbox');
    clusterPickerCheckbox?.childNodes.forEach((n) => {
      n.childNodes.forEach((n, i) => {
        (n as HTMLElement).style.setProperty("--background-color", checkboxColors[i]);
        (n as HTMLElement).style.setProperty("--border-color", checkboxColors[i]);
        const checkBoxInner = (n as HTMLElement).childNodes[0].childNodes[1] as HTMLElement;
        if (checkBoxInner !== undefined) {
          checkBoxInner.style.setProperty("background-color", checkboxColors[i]);
          checkBoxInner.style.setProperty("border-color", checkboxColors[i]);
        }
      });
    });

  }, [hueCenters, clusterOptions]);

  return (
    <div className="App">
      <Layout>
        <Header className='App-header'>
          <b style={{ color: 'white' }}>Colored Line Density Plot</b>
        </Header>
        <Layout>
          <Sider width={300} theme="light" className="site-layout-background" style={{ borderRight: "0.5px solid #ffffff", boxShadow: "darkgrey 0 0 10px 0" }}>
            <Divider>Parameters</Divider>
            <br />
            <Row>
              <Col span={6} className="item-text">Resolution:</Col>
              <Col span={18}>
                <InputNumber style={{ width: 80 }} min={0} max={2000} defaultValue={1000} step={1}
                  onChange={(value) => { setCanvasWidth(value as number) }} />
                &nbsp; X &nbsp;
                <InputNumber style={{ width: 80 }} min={0} max={2000} defaultValue={500} step={1}
                  onChange={(value) => { setCanvasHeight(value as number) }} />

              </Col>
            </Row>
            <br />
            <Row>
              <Col span={12} className="item-text">Bin Size:</Col>
              <Col span={12}>
                <InputNumber style={{ width: 100 }} min={0} max={10000} defaultValue={1} step={1}
                  onChange={(value) => { setBinSize(value as number) }} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col span={12} className="item-text">Initial Cluster Number:</Col>
              <Col span={12}>
                <InputNumber style={{ width: 100 }} min={0} max={20} defaultValue={1} step={1}
                  onChange={(value) => {
                    setInitClusterNum(value as number);
                    clusterDivisionByClusterNum(hc as Hierarchical, value as number, lineSet);
                    const newIfFixClusterColor = Array(value as number).fill(false);
                    const [newHueCenters, newBinClusterAssignment] = getHues(binsInfo, hc as Hierarchical, [], newIfFixClusterColor);
                    setHueCenters(newHueCenters);
                    setBinClusterAssignment(newBinClusterAssignment);
                    setIfFixClusterColor(newIfFixClusterColor);
                  }} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col span={12} className="item-text">Sampling Rate:</Col>
              <Col span={12}>
                <InputNumber style={{ width: 100 }} min={0} max={1} value={displaySamplingRate} step={0.05}
                  onChange={(value) => { setDisplaySamplingRate(value as number) }} />
              </Col>
            </Row>
            <br />
            <Row>
              <Col span={24} className="item-text">Minimum Density:</Col>
            </Row>
            <Row>
              <Col span={22} offset={1}>
                <Slider reverse min={0} max={maxDensityValue} value={maxDensityValue - minDisplayDensity}
                  tooltip={{ formatter: (value) => { return maxDensityValue - (value as number) } }}
                  onChange={(value) => {
                    setMinDisplayDensity((maxDensityValue - (value as number)))
                  }}
                  onAfterChange={(value) => {
                    setMinDisplayDensity(maxDensityValue - (value as number))
                  }}></Slider>
              </Col>
            </Row>
            <br />
            <Row>
              <Col span={14} className="item-text">Number of Sampling Bins: {sampledBinNum > 4000 ? <span style={{ color: "red" }}>{sampledBinNum}</span> : sampledBinNum}</Col>
              <Col span={10}> <Button type="primary" onClick={() => {
                setMinDensity(minDisplayDensity);
                setSamplingRate(displaySamplingRate);
              }}>Start Analysis
              </Button>
              </Col>
            </Row>
            <Divider>Cluster Options</Divider>
            <Row>
              <Col span={24} >Fix Cluster Color</Col>
            </Row>
            <div id='cluster-checkbox'>
              <Checkbox.Group style={{ 'width': '100%', }}
                name='clusterCheckBox'
                options={clusterOptions}
                value={checkboxState}
                onChange={(value) => {
                  setCheckboxState(value);
                  let newIfFixClusterColor = new Array(hueCenters.length).fill(false)
                  value.forEach((v) => { newIfFixClusterColor[v as number] = true; })
                  setIfFixClusterColor(newIfFixClusterColor);
                }} />
            </div>
            <Row>
              <Col span={24} >Pick Lines from Clusters</Col>
            </Row>
            <div id='cluster-picker-checkbox'>
              <Checkbox.Group style={{ 'width': '100%', }}
                name='clusterCheckBox'
                options={clusterOptions}
                value={clusterPickerCheckboxState}
                onChange={(value) => {
                  setClusterPickerCheckboxState(value);
                  if (hc) {
                    const [newPickedBinDensity, pickedBinClusterAssignment, newLineSetsForPickedClusters] = getHuesAndDensitiesForClusterPicker(binsInfo, hc, lineSet, value as number[]);
                    setPickedBinDensity(newPickedBinDensity);
                    //console.log(newPickedBinDensity);
                    const newPickedHues = pickedBinClusterAssignment.map((v) => { return hueCenters[v] });
                    setPickedHues(newPickedHues);
                    setLineSetsForPickedClusters(newLineSetsForPickedClusters);
                  }
                }} />
            </div>
            <Divider>Color Options</Divider>
            <div id="hue-picker"></div>
            <Row>
              <Col span={12} className="item-text">Hue Template:</Col>
              <Col span={12}>
                <Select defaultValue={hueTemplateType}
                  style={{ width: 100 }}
                  onChange={(value) => { setHueTemplateType(value); }}>
                  <Option value='N-Type'>None</Option>
                  <Option value='i-Type'>i-Type</Option>
                  <Option value='V-Type'>V-Type</Option>
                  <Option value='T-Type'>T-Type</Option>
                  <Option value='L-Type'>L-Type</Option>
                  <Option value='Lm-Type'>Lm-Type</Option>
                  <Option value='I-Type'>I-Type</Option>
                  <Option value='Y-Type'>Y-Type</Option>
                  <Option value='X-Type'>X-Type</Option>
                </Select>
              </Col>
            </Row>
            <Divider>Data Options</Divider>
            <Row>
              <Col span={3} />
              <Col span={18} >
                <Upload
                  accept=".csv"
                  showUploadList={false}
                  withCredentials={true}
                  method='post'
                  beforeUpload={file => {
                    papa.parse(file, {
                      header: true,
                      dynamicTyping: true,
                      complete: (results: papa.ParseResult<any>) => {

                        function groupBy(xs: any[], key: string) {
                          return xs.reduce(function (rv, x) {
                            (rv[x[key]] = rv[x[key]] || []).push(x);
                            return rv;
                          }, {});
                        };

                        const data = results.data;
                        const groupedData = groupBy(data, 'lineId');
                        const lines: { times?: number[]; xValues: number[]; yValues: number[]; }[] = [];

                        let xMin = Infinity;
                        let xMax = -Infinity;
                        let yMin = Infinity;
                        let yMax = -Infinity;

                        for (let rawLine of Object.values(groupedData) as { lineId: number; time?: string; x: string; y: string }[][]) {
                          if (rawLine[0].time) {
                            (rawLine as { lineId: number; time: string; x: string; y: string }[]).sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
                          } else {
                            rawLine.sort((a, b) => parseFloat(a.x) - parseFloat(b.x));
                          }


                          if (rawLine[0].time !== undefined) {
                            const line: { times: number[], xValues: number[], yValues: number[] } = { times: [], xValues: [], yValues: [] };
                            for (let i = 0; i < rawLine.length; ++i) {
                              line.times.push(parseFloat((rawLine[i] as { lineId: number; time: string; x: string; y: string }).time));
                              line.xValues.push(parseFloat(rawLine[i].x));
                              line.yValues.push(parseFloat(rawLine[i].y));
                            }
                            if (line.xValues.length <= 1) continue;
                            xMin = Math.min(xMin, ...line.xValues);
                            xMax = Math.max(xMax, ...line.xValues);
                            yMin = Math.min(yMin, ...line.yValues);
                            yMax = Math.max(yMax, ...line.yValues);
                            lines.push(line);
                          } else {
                            const line: { xValues: number[], yValues: number[] } = { xValues: [], yValues: [] };
                            for (let i = 0; i < rawLine.length; ++i) {
                              line.xValues.push(parseFloat(rawLine[i].x));
                              line.yValues.push(parseFloat(rawLine[i].y));
                            }
                            if (line.xValues.length <= 1) continue;
                            xMin = Math.min(xMin, ...line.xValues);
                            xMax = Math.max(xMax, ...line.xValues);
                            yMin = Math.min(yMin, ...line.yValues);
                            yMax = Math.max(yMax, ...line.yValues);
                            lines.push(line);
                          }
                        }
                        //console.log(lines);

                        if (lines[lines.length - 1].xValues.length <= 1) {
                          lines.pop();
                        }

                        // normalize data
                        for (let line of lines) {
                          line.xValues = line.xValues.map(x => (x - xMin) / (xMax - xMin) * canvasWidth);
                          line.yValues = line.yValues.map(y => (y - yMin) / (yMax - yMin) * canvasHeight);
                        }


                        //console.log(lines);
                        setLines(lines);
                        setLineSet(new Set(lines.map((line, i) => i)));
                      }

                    });
                    return false;
                  }}
                >
                  <Button type="default" block icon={<UploadOutlined />}>
                    Click to Upload
                  </Button>
                </Upload>
              </Col>
              <Col span={3} />
            </Row>
            <Row>
              <Col span={3} />
              <Col span={18} >
                <Button type="default" block icon={<DownloadOutlined />}
                  onClick={
                    () => {
                      const canvas = document.getElementById('diagram') as HTMLCanvasElement;
                      const img = canvas.toDataURL("image/png");
                      const link = document.createElement('a');
                      link.download = 'image.png';
                      link.href = img;
                      link.click();
                    }
                  }>
                  Download Image
                </Button>
              </Col>
              <Col span={3} />
            </Row>
            <Row>
              <Col span={3} />
              <Col span={18} >
                <Button type="default" block icon={<DownloadOutlined />}
                  onClick={
                    () => {
                      const canvas = document.getElementById('cluster-picker') as HTMLCanvasElement;
                      const img = canvas.toDataURL("image/png");
                      const link = document.createElement('a');
                      link.download = 'image.png';
                      link.href = img;
                      link.click();
                    }
                  }>
                  Download Picker
                </Button>
              </Col>
              <Col span={3} />
            </Row>
            <Row>
              <Col span={3} />
              <Col span={18} >
                <Button type="default" block icon={<DownloadOutlined />}
                  onClick={
                    () => {
                      const pickedLines = [];
                      for (let pickedCluster of clusterPickerCheckboxState) {
                        for (let lineId of lineSetsForPickedClusters[pickedCluster as number]) {
                          pickedLines.push({ lineId, ...lines[lineId] });
                        }
                      }
                      downloadCSV(pickedLines);
                    }
                  }>
                  Download Picked Lines
                </Button>
              </Col>
              <Col span={3} />
            </Row>
          </Sider>
          <Content style={{ backgroundColor: "#FFFFFF" }}>
            <div style={{ height: "20px" }} />
            <Canvas width={canvasWidth} height={canvasHeight} binSize={binSize}
              binDensity={binDensity} lines={lines} hues={hues} binsInfo={binsInfo}
              minDisplayDensity={minDisplayDensity}
              divideCluster={(x, y) => {
                const nearestClusterId = getNearestClusterNodeId(binsInfo[x][y], hc as Hierarchical);
                const preservedHues = [];

                const newIfFixClusterColor = [...ifFixClusterColor];
                if (hc?.nodes !== undefined) {
                  for (let i = 0; i < hc.nodes.length; ++i) {
                    if (nearestClusterId !== hc.nodes[i].id) {
                      preservedHues.push(hueCenters[i] as number);
                    } else {
                      if (ifFixClusterColor[i]) {
                        alert('This cluster has been fixed!');
                        return;
                      }
                      newIfFixClusterColor.splice(i, 1);
                    }
                  }
                }
                newIfFixClusterColor.push(false);
                newIfFixClusterColor.push(false);

                clusterDivision(hc as Hierarchical, nearestClusterId, lineSet);
                const [newHueCenters, newBinClusterAssignment] = getHues(binsInfo, hc as Hierarchical, preservedHues, newIfFixClusterColor);
                setHueCenters(newHueCenters);
                setBinClusterAssignment(newBinClusterAssignment);
                setIfFixClusterColor(newIfFixClusterColor);
              }}
              pickedBinDensity={pickedBinDensity}
              pickedHues={pickedHues}></Canvas>
          </Content>
        </Layout>
        <Footer className='App-footer' style={{ display: 'none' }}>
          Created by Yumeng Xue
          <a href='https://www.cgmi.uni-konstanz.de/'>CGMI.UNI.KN ©2022</a>
        </Footer>
      </Layout >
    </div >
  );
}

export default App;
