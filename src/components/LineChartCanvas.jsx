import React, { useEffect, useRef, useState } from "react";
import { scaleLinear, scaleBand } from "d3-scale";
import "../styles/LineChartCanvas.css";

const WIDTH = 1000;
const HEIGHT = 450;
const PADDING = 50;

export function calculateGChartLimits(values) {
  const cl = values.reduce((sum, v) => sum + v, 0) / values.length;
  const ucl = cl + 3 * Math.sqrt(cl);
  const lcl = Math.max(0, cl - 3 * Math.sqrt(cl));
  return { cl, ucl, lcl };
}

export function calculateTChartLimits(values) {
  if (values.length === 0) return { cl: 0, ucl: 0, lcl: 0 };
  const cl = values.reduce((sum, val) => sum + val, 0) / values.length;
  const range = Math.max(...values) - Math.min(...values);
  const ucl = cl + 0.5 * range;
  const lcl = Math.max(0, cl - 0.5 * range);
  return { cl, ucl, lcl };
}

export function calculateIChartLimits(values) {
  if (values.length < 2) return { cl: 0, ucl: 0, lcl: 0 };
  const cl = values.reduce((sum, val) => sum + val, 0) / values.length;
  const ranges = values.slice(1).map((val, i) => Math.abs(val - values[i]));
  const mrBar = ranges.reduce((sum, r) => sum + r, 0) / ranges.length;
  const d2 = 1.128;
  const sigma = mrBar / d2;
  const ucl = cl + 3 * sigma;
  const lcl = Math.max(0, cl - 3 * sigma);
  return { cl, ucl, lcl };
}

const LineChartCanvas = () => {
  const canvasRef = useRef(null);
  const [jsonData, setJsonData] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("NO_GROUP");
  const [selectedChartType, setSelectedChartType] = useState("G");

  const handleGroupChange = (e) => {
    setSelectedGroup(e.target.value);
  };
  const handleChartTypeChange = (e) => {
    setSelectedChartType(e.target.value);
  };

  const handleJsonUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const parsed = JSON.parse(event.target.result);
        setJsonData(parsed);
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    if (!jsonData) return;
    const ctx = canvasRef.current.getContext("2d");
    
    const groupMapping = jsonData.groupMapping;
    const dataRowMapping = jsonData.dataRowMapping;
    const categories = groupMapping[selectedGroup];
    if (!categories) return;

    const labels = categories.map((d) => d.categoryId.split("-").pop());
    const values = categories.map((d) => dataRowMapping[d.dataRowId].AC);
    let limits;
  if (selectedChartType === "G") {
    limits = calculateGChartLimits(values);
  } else if (selectedChartType === "I") {
    limits = calculateIChartLimits(values);
  } else {
    limits = calculateTChartLimits(values);
  }

  // Adjust yScale to include control limits
  const maxY = Math.max(...values, limits.ucl);
  const minY = Math.min(...values, limits.lcl);

    const xScale = scaleBand()   // categories values
      .domain(labels)
      .range([PADDING, WIDTH - PADDING])
      .padding(0.2);

    const yScale = scaleLinear()   // num values                    
     .domain([minY , maxY ])
      .range([HEIGHT - PADDING, PADDING]);

    const dataCanvas = new OffscreenCanvas(WIDTH, HEIGHT);
    const dataCtx = dataCanvas.getContext("2d");
    dataCtx.strokeStyle = "#2c70b8";
    dataCtx.lineWidth = 2;
    dataCtx.beginPath();
    categories.forEach((cat, i) => {
      const x = xScale(labels[i]) + xScale.bandwidth() / 2;
      const y = yScale(dataRowMapping[cat.dataRowId].AC);
      if (i === 0) dataCtx.moveTo(x, y);
      else dataCtx.lineTo(x, y);
    });
    dataCtx.stroke();

    // Draw points and value labels
    categories.forEach((cat, i) => {
      const value = dataRowMapping[cat.dataRowId].AC;
      const x = xScale(labels[i]) + xScale.bandwidth() / 2;
      const y = yScale(value);
      const displayVal = (value / 1_000_000).toFixed(1) + "m";

      dataCtx.fillStyle = "black";
      dataCtx.beginPath();
      dataCtx.arc(x, y, 3, 0, 2 * Math.PI);
      dataCtx.fill();

      dataCtx.fillStyle = "black";
      dataCtx.font = "12px Arial";
      dataCtx.textAlign = "center";
      dataCtx.fillText(displayVal, x, y - 10);
    });

    const qualityCanvas = new OffscreenCanvas(WIDTH, HEIGHT);
    const qualityCtx = qualityCanvas.getContext("2d");

   

    const drawLimitLine = (value, label, color) => {
      const y = yScale(value);
      qualityCtx.strokeStyle = color;
      qualityCtx.setLineDash([4, 4]);
      qualityCtx.beginPath();
      qualityCtx.moveTo(PADDING, y);
      qualityCtx.lineTo(WIDTH - PADDING, y);
      qualityCtx.stroke();
      qualityCtx.setLineDash([]);
      qualityCtx.fillStyle = color;
      qualityCtx.font = "bold 14px Arial";
      qualityCtx.fillText(label, WIDTH - PADDING + 10, y + 4);
    };

    drawLimitLine(limits.cl, `${selectedChartType} - CL (${(limits.cl / 1_000_000).toFixed(1)}m)`, "yellow");
    drawLimitLine(limits.ucl, `${selectedChartType} - UCL (${(limits.ucl / 1_000_000).toFixed(1)}m)`, "green");
    drawLimitLine(limits.lcl, `${selectedChartType} - LCL (${(limits.lcl / 1_000_000).toFixed(1)}m)`, "red");

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(qualityCanvas, 0, 0);
    ctx.drawImage(dataCanvas, 0, 0);

    // Draw Y Axis Grid & Labels
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
  const value = minY + ((maxY - minY) / 5) * i;
  const y = yScale(value);
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(WIDTH - PADDING, y);
  ctx.stroke();
  ctx.fillStyle = "#333";
  ctx.font = "12px Arial";
  ctx.textAlign = "right";
  ctx.fillText((value / 1_000_000).toFixed(0) + "m", PADDING - 5, y + 4);
}


    // Draw X Axis Labels
    labels.forEach((label) => {
      const x = xScale(label) + xScale.bandwidth() / 2;
      ctx.fillStyle = "#333";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(label, x, HEIGHT - PADDING + 20);
    });

    //    ctx.strokeStyle = "#000"; // Line color
    // ctx.lineWidth = 2;
    // ctx.beginPath();

    // // Y-axis line (vertical)
    // ctx.moveTo(PADDING, PADDING);
    // ctx.lineTo(PADDING, HEIGHT - PADDING);

    // // X-axis line (horizontal)
    // ctx.lineTo(WIDTH - PADDING, HEIGHT - PADDING);

    // ctx.stroke();

  }, [jsonData, selectedGroup, selectedChartType]);

  return (
    <div className="chart-container">
      <div className="chart-selectors">
        <h2>Custom Canvas Line Chart</h2>
        <label>
          Upload JSON:
          <input type="file" accept=".json" onChange={handleJsonUpload} />
        </label>

        <div className="Data-label-container">
          <label className="Data-label">
            Select Group:
            <select value={selectedGroup} onChange={handleGroupChange}>
              <option value="NO_GROUP">No Group</option>
              <option value="AVERAGE_GROUP">Average</option>
              <option value="TOTAL_GROUP">Total Group</option>
            </select>
          </label>
          <label>
            Select Chart Type:
            <select value={selectedChartType} onChange={handleChartTypeChange}>
              <option value="G">G Chart</option>
              <option value="I">I Chart</option>
              <option value="T">T Chart</option>
            </select>
          </label>
        </div>

      </div>

      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="chart-canvas"
      />
    </div>
  );

};

export default LineChartCanvas;
