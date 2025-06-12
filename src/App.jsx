import React from "react";
import LineChartCanvas from "./components/LineChartCanvas";
import jsonData from "./data/chartData.json"; // put your JSON here

function App() {
  return (
    <div>
      {/* <h2 className="header">Custom Canvas Line Chart</h2> */}
      <LineChartCanvas
        groupMapping={jsonData.groupMapping}
        dataRowMapping={jsonData.dataRowMapping}
      />
    </div>
  );
}

export default App;
