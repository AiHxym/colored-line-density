/*
 * @Author: Yumeng Xue
 * @Date: 2022-06-17 13:36:59
 * @LastEditTime: 2022-06-29 16:27:08
 * @LastEditors: Yumeng Xue
 * @Description: 
 * @FilePath: /trend-mixer/src/App.tsx
 */
import React, { useState, useEffect } from 'react';
import 'antd/dist/antd.min.css';
import { Button, Tabs, InputNumber, Layout, Select, Divider, Row, Col, List, Switch, Slider, Upload } from "antd";
import Canvas from './components/Canvas';
import papa from 'papaparse';
import { Line, ImportamceLine } from './core/defs/line';
import { UploadOutlined } from '@ant-design/icons';

import './App.css';
import { RcFile } from 'antd/lib/upload';

const { TabPane } = Tabs;
const { Header, Footer, Sider, Content } = Layout;
const { Option } = Select;

function App() {
  const [lines, setLines] = useState<Line[]>([]);
  return (
    <div className="App">
      <Layout>
        <Header></Header>
        <Layout>
          <Sider width={300} theme="light" className="site-layout-background">
            <Upload
              accept=".csv"
              showUploadList={false}
              beforeUpload={file => {
                papa.parse(file, {
                  header: true,
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
                    for (let line of lines) {
                      for (let point of line) {
                        if (point.x > maxX) {
                          maxX = point.x;
                        } if (point.y > maxY) {
                          maxY = point.y;
                        } if (point.x < minX) {
                          minX = point.x;
                        } if (point.y < minY) {
                          minY = point.y;
                        }
                      }
                    }
                    for (let line of lines) {
                      for (let point of line) {
                        point.x = (point.x - minX) / (maxX - minX) * 99;
                        point.y = (point.y - minY) / (maxY - minY) * 99;
                      }
                    }
                    setLines(lines);
                  }
                });
                // Prevent upload
                return false;
              }}
            >
              <Button type="dashed" block icon={<UploadOutlined />}>
                Click to Upload
              </Button>
            </Upload>
          </Sider>
          <Content>
            <Canvas lines={lines}></Canvas>
          </Content>
        </Layout>
        <Footer>CGMI.UNI.KN ©2022 Created by Yumeng Xue</Footer>
      </Layout >
    </div>
  );
}

export default App;
