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

interface MultiSignalData {
  timestamp: string;
  [key: string]: any; // for dynamic signal values
}

const SIGNAL_COLORS = [
  "#2563eb", "#dc2626", "#10b981", "#f59e0b", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
];

// Multi-Select Dropdown Component
function MultiSelectDropdown({ 
  label, 
  options, 
  selected, 
  onToggle,
  disabled = false
}: { 
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`border p-2 rounded flex justify-between items-center h-[42px] ${
          disabled 
            ? 'bg-gray-100 cursor-not-allowed text-gray-400' 
            : 'bg-white cursor-pointer'
        }`}
      >
        <span className="text-sm">
          {disabled 
            ? "Select machine first..."
            : selected.length === 0 
              ? "Select signals..." 
              : `${selected.length} signal${selected.length > 1 ? 's' : ''} selected`}
        </span>
        <span className="text-gray-500 text-xs">{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
            {options.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">No signals available</div>
            ) : (
              options.map((option, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => onToggle(option)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{option}</span>
                </label>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function SignalViewer() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  
  // Primary selection
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");

  // Comparison selection
  const [compareMode, setCompareMode] = useState(false);
  const [compareMachine, setCompareMachine] = useState("");
  const [compareSignals, setCompareSignals] = useState<string[]>([]);
  const [compareSignalsList, setCompareSignalsList] = useState<Signal[]>([]);

  const [multiSignalData, setMultiSignalData] = useState<MultiSignalData[]>([]);
  
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
        setSelectedSignals([]);
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
        setCompareSignalsList(list);
        setCompareSignals([]);
      })
      .catch(() => setError("Failed to load comparison signals"));
  }, [compareMachine, compareMode]);

  // ------------------ Toggle Signal Selection ------------------
  const toggleSignalSelection = (signal: string) => {
    setSelectedSignals(prev => 
      prev.includes(signal)
        ? prev.filter(s => s !== signal)
        : [...prev, signal]
    );
  };

  const toggleCompareSignalSelection = (signal: string) => {
    setCompareSignals(prev => 
      prev.includes(signal)
        ? prev.filter(s => s !== signal)
        : [...prev, signal]
    );
  };

  // ------------------ Fetch Multi-Signal Telemetry ------------------
  const fetchTelemetry = async () => {
    if (!selectedMachine || selectedSignals.length === 0 || !fromTime || !toTime) {
      setError("Please select machine and at least one signal");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Fetch data for all selected primary signals
      const primaryPromises = selectedSignals.map(signal =>
        fetch(
          `https://localhost:7292/api/Machine/data?machine=${selectedMachine}&signal=${signal}&from=${fromTime}&to=${toTime}`
        ).then(res => res.json())
      );

      const primaryResults = await Promise.all(primaryPromises);

      // Fetch data for comparison signals if enabled
      let compareResults: any[] = [];
      if (compareMode && compareMachine && compareSignals.length > 0) {
        const comparePromises = compareSignals.map(signal =>
          fetch(
            `https://localhost:7292/api/Machine/data?machine=${compareMachine}&signal=${signal}&from=${fromTime}&to=${toTime}`
          ).then(res => res.json())
        );
        compareResults = await Promise.all(comparePromises);
      }

      // Merge all data by timestamp
      const mergedData = mergeMultiSignalData(
        primaryResults,
        selectedSignals,
        selectedMachine,
        compareResults,
        compareSignals,
        compareMachine
      );

      setMultiSignalData(mergedData);
    } catch {
      setError("Failed to fetch telemetry data");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ Merge Data from Multiple Signals ------------------
  const mergeMultiSignalData = (
    primaryResults: TelemetryData[][],
    primarySignals: string[],
    primaryMachine: string,
    compareResults: TelemetryData[][],
    compSignals: string[],
    compMachine: string
  ): MultiSignalData[] => {
    const timestampMap = new Map<string, MultiSignalData>();

    // Add primary signals
    primaryResults.forEach((data, index) => {
      const signalName = primarySignals[index];
      const key = `${primaryMachine}_${signalName}`;
      
      data.forEach(item => {
        const ts = item.timestamp;
        if (!timestampMap.has(ts)) {
          timestampMap.set(ts, { timestamp: ts });
        }
        timestampMap.get(ts)![key] = item.value;
      });
    });

    // Add comparison signals
    if (compareMode && compMachine) {
      compareResults.forEach((data, index) => {
        const signalName = compSignals[index];
        const key = `${compMachine}_${signalName}`;
        
        data.forEach(item => {
          const ts = item.timestamp;
          if (!timestampMap.has(ts)) {
            timestampMap.set(ts, { timestamp: ts });
          }
          timestampMap.get(ts)![key] = item.value;
        });
      });
    }

    return Array.from(timestampMap.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  // ------------------ Fetch Averages ------------------
  const fetchAverages = async () => {
    if (!selectedMachine || !showStats) return;

    try {
      const res = await fetch(
        `https://localhost:7292/api/Machine/signal-averages?machine=${selectedMachine}&days=${periodDays}`
      );
      const data = await res.json();
      setAverages(data.signals || []);
    } catch {
      setAverages([]);
    }

    if (compareMode && compareMachine) {
      try {
        const compareRes = await fetch(
          `https://localhost:7292/api/Machine/signal-averages?machine=${compareMachine}&days=${periodDays}`
        );
        const compareData = await compareRes.json();
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

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString();

  // Generate line components for chart
  const renderLines = () => {
    const lines = [];
    let colorIndex = 0;

    // Primary machine lines
    selectedSignals.forEach(signal => {
      const key = `${selectedMachine}_${signal}`;
      lines.push(
        <Line
          key={key}
          type="monotone"
          dataKey={key}
          stroke={SIGNAL_COLORS[colorIndex % SIGNAL_COLORS.length]}
          dot={false}
          name={`${selectedMachine} - ${signal}`}
        />
      );
      colorIndex++;
    });

    // Comparison machine lines - all solid, no dashes
    if (compareMode && compareMachine) {
      compareSignals.forEach(signal => {
        const key = `${compareMachine}_${signal}`;
        lines.push(
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={SIGNAL_COLORS[colorIndex % SIGNAL_COLORS.length]}
            dot={false}
            name={`${compareMachine} - ${signal}`}
          />
        );
        colorIndex++;
      });
    }

    return lines;
  };

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
                  setCompareSignals([]);
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

            <MultiSelectDropdown
              label=""
              options={signals.map(s => s.signal)}
              selected={selectedSignals}
              onToggle={toggleSignalSelection}
              disabled={!selectedMachine}
            />

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

              <MultiSelectDropdown
                label=""
                options={compareSignalsList.map(s => s.signal)}
                selected={compareSignals}
                onToggle={toggleCompareSignalSelection}
                disabled={!compareMachine}
              />
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={fetchTelemetry}
            disabled={loading || selectedSignals.length === 0}
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
            Signal Trends - {selectedSignals.length + (compareMode ? compareSignals.length : 0)} Signals
          </h2>

          {multiSignalData.length === 0 ? (
            <p className="text-gray-500">No data - select signals and click "Fetch Trend Data"</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={multiSignalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={formatTime} />
                <YAxis />
                <Tooltip />
                <Legend />
                {renderLines()}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* -------- Average Bar Chart -------- */}
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