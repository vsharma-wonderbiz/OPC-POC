import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

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

interface SignalAverage {
  signal: string;
  average: number;
  unit: string;
}

export default function SignalViewer() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  
  // Primary selection
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedSignal, setSelectedSignal] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");

  // Comparison selection
  const [compareMode, setCompareMode] = useState(false);
  const [compareMachine, setCompareMachine] = useState("");
  const [compareSignal, setCompareSignal] = useState("");
  const [compareSignals, setCompareSignals] = useState<Signal[]>([]);

  const [telemetry, setTelemetry] = useState<TelemetryData[]>([]);
  const [compareTelemetry, setCompareTelemetry] = useState<TelemetryData[]>([]);
  
  const [averages, setAverages] = useState<SignalAverage[]>([]);
  const [compareAverages, setCompareAverages] = useState<SignalAverage[]>([]);
  const [periodDays, setPeriodDays] = useState(7);
  const [showStats, setShowStats] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ------------------ Fetch Machines ------------------
  useEffect(() => {
    fetch("https://localhost:7292/api/Machine")
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data)
          ? data.map((m: any) =>
              typeof m === "string" ? { machine: m } : m
            )
          : [];
        setMachines(list);
      })
      .catch(() => setError("Failed to load machines"));
  }, []);

  // ------------------ Fetch Signals for Primary Machine ------------------
  useEffect(() => {
    if (!selectedMachine) return;

    fetch(`https://localhost:7292/api/Machine/${selectedMachine}/signals`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data)
          ? data.map((s: any) =>
              typeof s === "string" ? { signal: s } : s
            )
          : [];
        setSignals(list);
        setSelectedSignal("");
      })
      .catch(() => setError("Failed to load signals"));
  }, [selectedMachine]);

  // ------------------ Fetch Signals for Compare Machine ------------------
  useEffect(() => {
    if (!compareMachine || !compareMode) return;

    fetch(`https://localhost:7292/api/Machine/${compareMachine}/signals`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data)
          ? data.map((s: any) =>
              typeof s === "string" ? { signal: s } : s
            )
          : [];
        setCompareSignals(list);
        setCompareSignal("");
      })
      .catch(() => setError("Failed to load comparison signals"));
  }, [compareMachine, compareMode]);


  const fetchTelemetry = async () => {
    if (!selectedMachine || !selectedSignal || !fromTime || !toTime) {
      setError("Please select all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      
      const res = await fetch(
        `https://localhost:7292/api/Machine/data?machine=${selectedMachine}&signal=${selectedSignal}&from=${fromTime}&to=${toTime}`
      );
      const data = await res.json();
      console.log(data);
      setTelemetry(data || []);

     
      if (compareMode && compareMachine && compareSignal) {
        const compareRes = await fetch(
          `https://localhost:7292/api/Machine/data?machine=${compareMachine}&signal=${compareSignal}&from=${fromTime}&to=${toTime}`
        );
        const compareData = await compareRes.json();
        setCompareTelemetry(compareData || []);
      } else {
        setCompareTelemetry([]);
      }
    } catch {
      setError("Failed to fetch telemetry data");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Fetch Averages ------------------
  const fetchAverages = async () => {
    if (!selectedMachine || !showStats) return;

    try {
      const res = await fetch(
        `https://localhost:7292/api/Machine/signal-averages?machine=${selectedMachine}&days=${periodDays}`
      );
      const data = await res.json();
      console.log(data)
      setAverages(data.signals || []);
    } catch {
      setAverages([]);
    }

    // Fetch comparison machine averages if in compare mode
    if (compareMode && compareMachine) {
      try {
        const compareRes = await fetch(
          `https://localhost:7292/api/Machine/signal-averages?machine=${compareMachine}&days=${periodDays}`
        );
        const compareData = await compareRes.json();
        console.log(compareData)
        setCompareAverages(compareData.signals || []);
      } catch {
        setCompareAverages([]);
      }
    } else {
      setCompareAverages([]);
    }
  };

  useEffect(() => {
    if (showStats) {
      fetchAverages();
    }
  }, [selectedMachine, compareMachine, periodDays, showStats, compareMode]);

  // ------------------ Chart Helpers ------------------
  const avgChartData = averages.map(a => ({
    name: a.signal,
    value: a.average,
    unit: a.unit
  }));

  const compareAvgChartData = compareAverages.map(a => ({
    name: a.signal,
    value: a.average,
    unit: a.unit
  }));

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString();

  // Merge telemetry data for comparison chart
  const mergedData = telemetry.map((item, index) => {
    const compareItem = compareTelemetry[index];
    return {
      timestamp: item.timestamp,
      value1: item.value,
      value2: compareItem ? compareItem.value : null
    };
  });

  // ================== UI ==================
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-3xl font-bold mb-6">
          Machine Signal Dashboard
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* -------- Compare Mode Toggle -------- */}
        <div className="bg-white p-4 rounded shadow mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => {
                setCompareMode(e.target.checked);
                if (!e.target.checked) {
                  setCompareMachine("");
                  setCompareSignal("");
                  setCompareTelemetry([]);
                }
              }}
              className="w-4 h-4"
            />
            <span className="font-medium">Enable Signal Comparison</span>
          </label>
        </div>

        {/* -------- Primary Controls -------- */}
        <div className="bg-white p-6 rounded shadow mb-6">
          <h3 className="font-semibold mb-3">Primary Signal</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={selectedMachine}
              onChange={e => setSelectedMachine(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="">Select Machine</option>
              {machines.map((m, i) => (
                <option key={i} value={m.machine}>{m.machine}</option>
              ))}
            </select>

            <select
              value={selectedSignal}
              onChange={e => setSelectedSignal(e.target.value)}
              className="border p-2 rounded"
              disabled={!signals.length}
            >
              <option value="">Select Signal</option>
              {signals.map((s, i) => (
                <option key={i} value={s.signal}>{s.signal}</option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={fromTime}
              onChange={e => setFromTime(e.target.value)}
              className="border p-2 rounded"
            />

            <input
              type="datetime-local"
              value={toTime}
              onChange={e => setToTime(e.target.value)}
              className="border p-2 rounded"
            />
          </div>
        </div>

        {/* -------- Comparison Controls -------- */}
        {compareMode && (
          <div className="bg-white p-6 rounded shadow mb-6">
            <h3 className="font-semibold mb-3">Comparison Signal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={compareMachine}
                onChange={e => setCompareMachine(e.target.value)}
                className="border p-2 rounded"
              >
                <option value="">Select Machine</option>
                {machines.map((m, i) => (
                  <option key={i} value={m.machine}>{m.machine}</option>
                ))}
              </select>

              <select
                value={compareSignal}
                onChange={e => setCompareSignal(e.target.value)}
                className="border p-2 rounded"
                disabled={!compareSignals.length}
              >
                <option value="">Select Signal</option>
                {compareSignals.map((s, i) => (
                  <option key={i} value={s.signal}>{s.signal}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={fetchTelemetry}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Fetch Trend Data"}
          </button>

          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-6 py-2 rounded ${
              showStats ? "bg-green-600 text-white" : "bg-gray-200"
            }`}
          >
            {showStats ? "Hide Stats" : "Show Stats"}
          </button>
        </div>

        {/* -------- Line Chart -------- */}
        <div className="bg-white p-6 rounded shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Signal Trend
          </h2>

          {telemetry.length === 0 ? (
            <p className="text-gray-500">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={compareMode && compareTelemetry.length > 0 ? mergedData : telemetry}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={formatTime} />
                <YAxis />
                <Tooltip />
                <Legend />
                {compareMode && compareTelemetry.length > 0 ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="value1"
                      stroke="#2563eb"
                      dot={false}
                      name={`${selectedMachine} - ${selectedSignal}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="value2"
                      stroke="#dc2626"
                      dot={false}
                      name={`${compareMachine} - ${compareSignal}`}
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2563eb"
                    dot={false}
                    name={selectedSignal}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* -------- Average Bar Chart (Only shown when showStats is true) -------- */}
        {showStats && (
          <>
            <div className="bg-white p-6 rounded shadow mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {selectedMachine} - {periodDays}-Day Signal Averages
                </h2>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPeriodDays(7)}
                    className={`px-4 py-1 rounded ${
                      periodDays === 7 ? "bg-blue-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setPeriodDays(30)}
                    className={`px-4 py-1 rounded ${
                      periodDays === 30 ? "bg-blue-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    Month
                  </button>
                </div>
              </div>

              {averages.length === 0 ? (
                <p className="text-gray-500">No statistics available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={avgChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="value"
                      fill="#2563eb"
                      name="Average"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Comparison Machine Stats */}
            {compareMode && compareMachine && (
              <div className="bg-white p-6 rounded shadow">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {compareMachine} - {periodDays}-Day Signal Averages
                  </h2>
                </div>

                {compareAverages.length === 0 ? (
                  <p className="text-gray-500">Loading Statistics</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={compareAvgChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="value"
                        fill="#dc2626"
                        name="Average"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}