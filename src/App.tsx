/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:36:59
 * @LastEditTime: 2022-11-13 23:58:05
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/App.tsx
 */
import React, { useState, useEffect, useRef } from 'react';
import 'antd/dist/antd.min.css';
import { Button, Tabs, InputNumber, Layout, Select, Divider, Row, Col, List, Switch, Slider, Upload } from "antd";
import Canvas from './components/Canvas';
import papa from 'papaparse';
import axios from 'axios';
import { Line, ImportamceLine } from './core/defs/line';
import { UploadOutlined } from '@ant-design/icons';
import * as d3 from 'd3';

import './App.css';
import { RcFile } from 'antd/lib/upload';

const { TabPane } = Tabs;
const { Header, Footer, Sider, Content } = Layout;
const { Option } = Select;


function App() {
  const [lines, setLines] = useState<Line[]>([]);
  const [lowDimensionalLines, setLowDimensionalLines] = useState<number[][]>([]);
  const [features, setFeatures] = useState<number[][]>([]);
  const [clusters, setClusters] = useState<number[]>([]);
  const [hues, setHues] = useState<number[]>([]);
  const [binDensity, setBinDensity] = useState<number[][]>([]);
  const [manifoldMethod, setManifoldMethod] = useState<string>('UMAP');
  const [componentsNum, setComponentsNum] = useState<number | undefined>(undefined);
  const [hueCenters, setHueCenters] = useState<number[]>([]);
  const [clusterProbs, setClusterProbs] = useState<number[][]>([]);


  useEffect(() => {
    axios.defaults.withCredentials = true;
    axios.get('http://134.34.231.83:8080/set_cookie');
  }, []);

  useEffect(() => {
    let dotProduct = (a: number[], b: number[]) => a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
    setHues(clusterProbs.map(clusterProb => dotProduct(clusterProb, hueCenters)));
  }, [hueCenters, clusterProbs]);

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


    let bar = hueCount.map(v => Math.floor(v / hueCountMax * (bar_max - bar_min)) + bar_min); // random
    //bar = new Array(360).fill(1).map(i => Math.floor(Math.random() * (bar_max - bar_min)) + bar_min);


    console.log(bar);

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
  }, [hueCenters, clusterProbs, hues, binDensity]);

  return (
    <div className="App">
      <Layout>
        <Header></Header>
        <Layout>
          <Sider width={300} theme="light" className="site-layout-background">
            <Divider>Parameters</Divider>
            <Row>
              <Col span={12} className="item-text">Manifold Method:</Col>
              <Col span={12}>
                <Select defaultValue={manifoldMethod} style={{ width: 100 }} onChange={(value) => {
                  axios.post('http://134.34.231.83:8080/set_manifold', {
                    manifoldMethod: value
                  })
                    .then(function (response) {
                      console.log(response);
                    })
                    .catch(function (error) {
                      console.log(error);
                    });
                  setManifoldMethod(value);
                }}>
                  <Option value="UMAP">UMAP</Option>
                  <Option value="t-SNE">t-SNE</Option>
                  <Option value="LLE">LLE</Option>
                </Select>
              </Col>
            </Row>
            <br />
            <Row>
              <Col span={12} className="item-text">GMM Components:</Col>
              <Col span={12}>
                <InputNumber style={{ width: 100 }} min={0} max={10000} defaultValue={undefined} step={1}
                  onChange={(value) => { setComponentsNum(value) }}
                  onPressEnter={(e) => {
                    axios.post('http://134.34.231.83:8080/set_GMM_components', {
                      componentsNum: componentsNum
                    })
                      .then(function (response) {
                        console.log(response);
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
            <Divider>Color Options</Divider>
            <div id="hue-picker"></div>
            <Divider>Data Options</Divider>
            <Upload
              accept=".csv"
              showUploadList={false}
              action="http://134.34.231.83:8080/upload"
              withCredentials={true}
              method='post'
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
                // Prevent upload
                return true;
              }}
              onChange={info => {
                const { status } = info.file;
                if (status !== 'uploading') {
                  console.log(info.file, info.fileList);
                  setBinDensity(info.file.response);
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
            <Canvas binDensity={binDensity} lines={lines} lowDimensionalLines={lowDimensionalLines} features={features} clusters={clusters} hues={hues}></Canvas>
          </Content>
        </Layout>
        <Footer>CGMI.UNI.KN ©2022 Created by Yumeng Xue</Footer>
      </Layout >
    </div>
  );
}

export default App;
