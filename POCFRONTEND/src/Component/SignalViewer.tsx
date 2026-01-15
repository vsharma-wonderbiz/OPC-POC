import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Machine {
  machine: string;
}

interface Signal {
  signal: string;
}

interface TelemetryData {
  timestamp: string;
  value: number;
}

export default function SignalViewer() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedSignal, setSelectedSignal] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  
  useEffect(() => {
    async function fetchMachines() {
      try {
        setDebugInfo("Fetching machines...");
        const res = await fetch("https://localhost:7292/api/Machine");
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        
        console.log("Machines API Response:", data);
        setDebugInfo(`Received ${data?.length || 0} machines`);
        
      
        let machinesList: Machine[] = [];
        if (Array.isArray(data)) {
        
          machinesList = data.map(item => {
           
            if (typeof item === 'string') {
              return { machine: item };
            }
          
            return item;
          });
        }
        
        setMachines(machinesList);
        setError("");
      } catch (err) {
        console.error("Failed to fetch machines:", err);
        setError(`Failed to fetch machines: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setDebugInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    fetchMachines();
  }, []);

 
  useEffect(() => {
    if (!selectedMachine) {
      setSignals([]);
      return;
    }
    
    async function fetchSignals() {
      try {
        setDebugInfo(`Fetching signals for ${selectedMachine}...`);
        const res = await fetch(
          `https://localhost:7292/api/Machine/${selectedMachine}/signals`
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        
        
        console.log("Signals API Response:", data);
        setDebugInfo(`Received ${data?.length || 0} signals`);
       
        let signalsList: Signal[] = [];
        if (Array.isArray(data)) {
          signalsList = data.map(item => {
            if (typeof item === 'string') {
              return { signal: item };
            }
            return item;
          });
        }
        
        setSignals(signalsList);
        setSelectedSignal("");
        setError("");
      } catch (err) {
        console.error("Failed to fetch signals:", err);
        setError(`Failed to fetch signals: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setDebugInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setSignals([]);
      }
    }
    fetchSignals();
  }, [selectedMachine]);

  
  const fetchTelemetry = async () => {
    if (!selectedMachine || !selectedSignal || !fromTime || !toTime) {
      setError("Please select all fields before fetching data.");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      setDebugInfo("Fetching telemetry data...");
      const res = await fetch(
        `https://localhost:7292/api/Machine/data?machine=${selectedMachine}&signal=${selectedSignal}&from=${fromTime}&to=${toTime}`
      );
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // Debug: Log the actual response
      console.log("Telemetry API Response:", data);
      setDebugInfo(`Received ${data?.length || 0} data points`);
      
      setTelemetry(data || []);
      
      if (!data || data.length === 0) {
        setError("No data found for the selected parameters.");
      }
    } catch (err) {
      console.error("Failed to fetch telemetry:", err);
      setError(`Failed to fetch telemetry data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDebugInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setTelemetry([]);
    } finally {
      setLoading(false);
    }
  };

  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatTooltip = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Signal Viewer</h1>


        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

    
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

            
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Machine: ({machines.length} available)
              </label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">--Select Machine--</option>
                {machines.map((m, idx) => (
                  <option key={idx} value={m.machine}>
                    {m.machine || `Machine ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

          
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Signal: ({signals.length} available)
              </label>
              <select
                value={selectedSignal}
                onChange={(e) => setSelectedSignal(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                disabled={!signals.length}
              >
                <option value="">--Select Signal--</option>
                {signals.map((s, idx) => (
                  <option key={idx} value={s.signal}>
                    {s.signal || `Signal ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                From:
              </label>
              <input
                type="datetime-local"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                To:
              </label>
              <input
                type="datetime-local"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={fetchTelemetry}
            disabled={loading || !selectedMachine || !selectedSignal || !fromTime || !toTime}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? "Loading..." : "Fetch Data"}
          </button>
        </div>


      
        <div className="bg-white rounded-lg shadow-md p-6">
          {telemetry.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <p className="text-lg">No data to display.</p>
              <p className="text-sm mt-2">Select parameters and fetch data to view the chart.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={telemetry}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatXAxis}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={formatTooltip}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  name={selectedSignal || "Value"}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}