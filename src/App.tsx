/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:36:59
 * @LastEditTime: 2022-12-01 00:10:24
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/App.tsx
 */
import React, { useState, useEffect, useRef } from 'react';
import 'antd/dist/antd.min.css';
import {
  Button, Tabs, InputNumber, Layout, Select, Divider,
  Row, Col, List, Switch, Slider, Upload, Checkbox, CheckboxOptionType
} from "antd";
import type { CheckboxValueType } from 'antd/es/checkbox/Group';
import Canvas from './components/Canvas';
import papa from 'papaparse';
import axios from 'axios';
import { Line, ImportamceLine } from './core/defs/line';
import { UploadOutlined } from '@ant-design/icons';
import * as d3 from 'd3';

import './App.css';
import { RcFile } from 'antd/lib/upload';
import { BinningMap } from './core/binning';

const { TabPane } = Tabs;
const { Header, Footer, Sider, Content } = Layout;
const { Option } = Select;

let a1 = 360 * 0.05;  // i, L, I
let a2 = 360 * 0.22;  // L
let a3 = 360 * 0.26;  // V, Y, X
let a4 = 360 * 0.50;  // T
let hueTemplates: { [key: string]: number[] } = {};
hueTemplates['i-Type'] = [360, a1];  // center, range
hueTemplates['V-Type'] = [360, a3];
hueTemplates['T-Type'] = [360, a4];
hueTemplates['L-Type'] = [360, 90, a1, a2];  // centers *2 & ranges *2
hueTemplates['Lm-Type'] = [360, 270, a1, a2];
hueTemplates['I-Type'] = [360, 180, a1, a1];
hueTemplates['Y-Type'] = [360, 180, a3, a1];
hueTemplates['X-Type'] = [360, 180, a3, a3];

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


function App() {
  const [lines, setLines] = useState<Line[]>([]);
  const [lowDimensionalLines, setLowDimensionalLines] = useState<number[][]>([]);
  const [features, setFeatures] = useState<number[][]>([]);
  const [clusters, setClusters] = useState<number[]>([]);
  const [hues, setHues] = useState<number[]>([]);
  const [binDensity, setBinDensity] = useState<number[][]>([]);
  const [MMMethod, setMMMethod] = useState<string>('BMM');
  const [componentsNum, setComponentsNum] = useState<number | undefined>(undefined);
  const [hueCenters, setHueCenters] = useState<number[]>([]);
  const [clusterProbs, setClusterProbs] = useState<number[][]>([]);
  const [binsInfo, setBinsInfo] = useState<BinningMap>([]);
  const [hueTemplateType, setHueTemplateType] = useState<string>('N-Type');
  const [hueTemplateRotation, setHueTemplateRotation] = useState<number>(0);
  const [hueTemplateDomain, setHueTemplateDomain] = useState<number[]>(Array.from(Array(360), (_, i) => i));
  const [clusterOptions, setClusterOptions] = useState<(string | number | CheckboxOptionType)[]>([]);
  const [ifShowedCluster, setIfShowedCluster] = useState<boolean[]>([]);
  const [checkboxState, setCheckboxState] = useState<CheckboxValueType[]>([]);
  const [lineProbsofEachCluster, setLineProbsofEachCluster] = useState<number[][]>([]);


  useEffect(() => {
    axios.defaults.withCredentials = true;
    axios.get('http://134.34.231.83:8080/set_cookie');
  }, []);

  useEffect(() => {
    if (clusterProbs.length === 0) {
      return;
    }

    let dotProduct = (a: number[], b: number[]) => a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
    setHues(clusterProbs.map(clusterProb => dotProduct(clusterProb, hueCenters)));
    if (componentsNum !== undefined && binsInfo.length > 0) {
      //console.log(binsInfo);
      const lineProbsofClusters = Array(lines.length).fill(0).map(() => Array(componentsNum).fill(0));
      for (let i = 0; i < binsInfo.length; ++i) {
        const clusterLineSetForThisTime = [];

        for (let k = 0; k < componentsNum; ++k) {
          clusterLineSetForThisTime.push(new Set());
        }

        for (let j = 0; j < binsInfo[i].length; ++j) {
          if (i * binsInfo[i].length + j < clusterProbs.length) {
            const clusterOfThisBin = argMax(clusterProbs[i * binsInfo[i].length + j]);
            const lineSet = binsInfo[i][j];
            for (let lineID of lineSet) {
              if (!clusterLineSetForThisTime[clusterOfThisBin].has(lineID)) {
                lineProbsofClusters[lineID][clusterOfThisBin] += 1 / binsInfo.length;
                clusterLineSetForThisTime[clusterOfThisBin].add(lineID);
              }
            }
          }
        }
      }
      console.log(lineProbsofClusters);
      setLineProbsofEachCluster(lineProbsofClusters);
    }
  }, [hueCenters, clusterProbs, binsInfo, componentsNum, lines.length]);

  useEffect(() => {
    if (hueTemplateType !== 'N-Type') {
      let singleSector = ['i-Type', 'V-Type', 'T-Type'];
      let doubleSectors = ['L-Type', 'Lm-Type', 'I-Type', 'Y-Type', 'X-Type'];
      let ht = hueTemplates[hueTemplateType];
      let centers: number[] = []; // centers of each sector
      let init_c: number[] = [];  // store initial centers
      let starts: number[] = [];  // starting hue of each sector
      let ranges: number[] = [];  // ranges of each sector
      let newDomain = new Array();
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
      if (binDensity[Math.floor(i / binDensity[0].length)][i % binDensity[0].length] > 0) {
        ++hueCount[Math.floor(h)];
      }
    });
    let hueCountMax = Math.max(...hueCount);


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
      let newDomain = new Array();
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
  }, [hueCenters, clusterProbs, hues, binDensity, hueTemplateType, hueTemplateRotation, hueTemplateDomain]);

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
        if (idx == 0) { new_H[i] = sector1_h.shift(); }
        else { new_H[i] = sector2_h.shift(); }
      })
      return new_H;
    }
  }

  useEffect(() => {
    ifShowedCluster.forEach((show, i) => {
      if (show) {
        d3.select('#hue-center' + i).attr('visibility', 'visible')
      }
      else {
        d3.select('#hue-center' + i).attr('visibility', 'hidden')
      }
    })
  }, [ifShowedCluster])

  useEffect(() => {

    const color_C = 120;
    const color_L = 55;
    let checkboxColors = hueCenters.map((h) => d3.hcl(h, color_C, color_L).formatHex())

    let cluster_checkbox = document.getElementById('cluster-checkbox');
    cluster_checkbox?.childNodes.forEach((n) => {
      n.childNodes.forEach((n, i) => {
        (n as HTMLElement).style.setProperty("--background-color", checkboxColors[i]);
        (n as HTMLElement).style.setProperty("--border-color", checkboxColors[i]);
      })
    })

  }, [componentsNum, hueCenters]);

  return (
    <div className="App">
      <Layout>
        <Header></Header>
        <Layout>
          <Sider width={300} theme="light" className="site-layout-background">
            <Divider>Parameters</Divider>
            {

              <Row>
                <Col span={12} className="item-text">Type:</Col>
                <Col span={12}>
                  <Select defaultValue={MMMethod} style={{ width: 100 }} onChange={(value) => {
                    // axios.post('http://134.34.231.83:8080/set_manifold', {
                    //   MMMethod: value
                    // })
                    //   .then(function (response) {
                    //     console.log(response);
                    //   })
                    //   .catch(function (error) {
                    //     console.log(error);
                    //   });
                    setMMMethod(value);
                  }}>
                    <Option value="BMM">Binary</Option>
                    <Option value="MMM">Categorical</Option>
                    <Option value="GMM">Continues</Option>
                  </Select>
                </Col>
              </Row>

            }
            <br />
            <Row>
              <Col span={12} className="item-text">GMM Components:</Col>
              <Col span={12}>
                <InputNumber style={{ width: 100 }} min={0} max={10000} defaultValue={undefined} step={1}
                  onChange={(value) => { setComponentsNum(value) }}
                  onPressEnter={(e) => {
                    axios.post('http://134.34.231.83:8080/set_GMM_components', {
                      componentsNum: componentsNum,
                      method: MMMethod
                    })
                      .then(function (response) {
                        //console.log(response);
                        setClusterProbs(response.data.clusterProbs)
                        setHueCenters(response.data.hueCenters)
                        //setHues(response.data);
                      })
                      .catch(function (error) {
                        console.log(error);
                      });
                  }} />
              </Col>
            </Row>
            <br />
            <div id='cluster-checkbox'>
              <Checkbox.Group style={{ 'width': '100%', }}
                name='clusterCheckBox'
                options={clusterOptions}
                value={checkboxState}
                onChange={(value) => {
                  setCheckboxState(value);
                  let ifShow = new Array(componentsNum).fill(false)
                  value.forEach((v) => { ifShow[v as number] = true; })
                  setIfShowedCluster(ifShow);
                }} />
            </div>
            <br />
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
            <Upload
              accept=".csv"
              showUploadList={false}
              action="http://134.34.231.83:8080/upload"
              withCredentials={true}
              method='post'
              data={{ method: MMMethod }}
              beforeUpload={file => {
                const fileName = file.name;
                /*
                if (fileName === "representation.csv") {
                  papa.parse(file, {
                    header: false,
                    complete: (results: papa.ParseResult<any>) => {
                      const data = results.data;
                      setLowDimensionalLines(data);
                    }
                  });
                } else if (fileName === "features.csv") {
                  papa.parse(file, {
                    header: false,
                    dynamicTyping: true,
                    complete: (results: papa.ParseResult<any>) => {
                      const data = results.data;
                      if (data.length < 1280000) {
                        for (let i = data.length; i < 1280000; ++i) {
                          data.push(new Array(data[0].length).fill(0));
                        }
                      }
                      setFeatures(data);
                    }
                  });
                } else if (fileName === "clusters.csv") {
                  papa.parse(file, {
                    header: false,
                    dynamicTyping: true,
                    complete: (results: papa.ParseResult<any>) => {
                      const data = results.data;
                      setClusters(data.map(d => d[0]));
                    }
                  });
                } else if (fileName === "hues.csv") {
                  papa.parse(file, {
                    header: false,
                    dynamicTyping: true,
                    complete: (results: papa.ParseResult<any>) => {
                      const data = results.data;
                      setHues(data.map(d => d[0]));
                    }
                  });
                } else {

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
                      const lines: Line[] = [];
                      let maxX = -Infinity;
                      let maxY = -Infinity;
                      let minX = Infinity;
                      let minY = Infinity;
                      for (let rawLine of Object.values(groupedData) as { lineId: number; x: string; y: string }[][]) {
                        const line: Line = rawLine.map((rawPoint: any) => {
                          return {
                            x: parseFloat(rawPoint.x),
                            y: parseFloat(rawPoint.y)
                          }
                        })
                        lines.push(line);
                      }
                    
                      console.log(lines);
                      setLines(lines);

                    }
                  });
                }*/


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
                    const lines: Line[] = [];
                    let maxX = -Infinity;
                    let maxY = -Infinity;
                    let minX = Infinity;
                    let minY = Infinity;
                    for (let rawLine of Object.values(groupedData) as { lineId: number; x: string; y: string }[][]) {
                      const line: Line = rawLine.map((rawPoint: any) => {
                        return {
                          x: parseFloat(rawPoint.x),
                          y: parseFloat(rawPoint.y)
                        }
                      })
                      maxX = Math.max(maxX, ...line.map(p => p.x));
                      maxY = Math.max(maxY, ...line.map(p => p.y));
                      minX = Math.min(minX, ...line.map(p => p.x));
                      minY = Math.min(minY, ...line.map(p => p.y));
                      lines.push(line);
                    }
                    for (let line of lines) {
                      for (let point of line) {
                        point.x = (point.x - minX) / (maxX - minX) * 999;
                        point.y = (point.y - minY) / (maxY - minY) * 499;
                      }
                    }


                    if (lines[lines.length - 1].length === 1) {
                      lines.pop();
                    }
                    //console.log(lines);
                    setLines(lines);

                  }
                });

                return true;
              }}
              onChange={info => {
                const { status } = info.file;
                if (status !== 'uploading') {
                  console.log(info.file, info.fileList);
                  setBinDensity(info.file.response.densityMap);
                  for (let i = 0; i < info.file.response.bins.length; ++i) {
                    for (let j = 0; j < info.file.response.bins[i].length; ++j) {
                      info.file.response.bins[i][j] = new Set(info.file.response.bins[i][j]);
                    }
                  }
                  setBinsInfo(info.file.response.bins);
                }
                if (status === 'done') {
                  console.log(`${info.file.name} file uploaded successfully.`);
                } else if (status === 'error') {
                  console.log(`${info.file.name} file upload failed.`);
                }
              }}
            >
              <Button type="default" block icon={<UploadOutlined />}>
                Click to Upload
              </Button>
            </Upload>
          </Sider>
          <Content>
            <Canvas binDensity={binDensity} lines={lines} lowDimensionalLines={lowDimensionalLines}
              features={features} clusters={clusters} hues={hues} binsInfo={binsInfo}
              clusterProbs={clusterProbs} lineProbsofEachCluster={lineProbsofEachCluster}></Canvas>
          </Content>
        </Layout>
        <Footer>CGMI.UNI.KN ©2022 Created by Yumeng Xue</Footer>
      </Layout >
    </div>
  );
}

export default App;
