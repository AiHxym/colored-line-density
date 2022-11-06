/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:36:59
 * @LastEditTime: 2022-11-06 22:55:42
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/App.tsx
 */
import React, { useState, useEffect } from 'react';
import 'antd/dist/antd.min.css';
import { Button, Tabs, InputNumber, Layout, Select, Divider, Row, Col, List, Switch, Slider, Upload } from "antd";
import Canvas from './components/Canvas';
import papa from 'papaparse';
import axios from 'axios';
import { Line, ImportamceLine } from './core/defs/line';
import { UploadOutlined } from '@ant-design/icons';

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

  useEffect(() => {
    fetch('http://134.34.231.83:8080/set_cookie')
      .then(data => {
        return data;
      })
      .then(post => {
        console.log(post);
      });

  }, []);

  return (
    <div className="App">
      <Layout>
        <Header></Header>
        <Layout>
          <Sider width={300} theme="light" className="site-layout-background">
            <Upload
              accept=".csv"
              showUploadList={false}
              action="http://134.34.231.83:8080/upload"
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
                }
                if (status === 'done') {
                  console.log(`${info.file.name} file uploaded successfully.`);
                } else if (status === 'error') {
                  console.log(`${info.file.name} file upload failed.`);
                }
              }}
            >
              <Button type="dashed" block icon={<UploadOutlined />}>
                Click to Upload
              </Button>
            </Upload>
          </Sider>
          <Content>
            <Canvas lines={lines} lowDimensionalLines={lowDimensionalLines} features={features} clusters={clusters} hues={hues}></Canvas>
          </Content>
        </Layout>
        <Footer>CGMI.UNI.KN ©2022 Created by Yumeng Xue</Footer>
      </Layout >
    </div>
  );
}

export default App;
