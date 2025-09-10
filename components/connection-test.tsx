"use client"

import { useState } from "react"

interface Device {
  username: string
  password: string
  host: string
  directory: string
}

interface ConnectionResponse {
  connection_tests: {
    device1: {
      message: string
      status: string
    }
    device2: {
      message: string
      status: string
    }
  }
  status: string
  timestamp: string
}

export default function ConnectionTest() {
  const [device1, setDevice1] = useState<Device>({
    username: "",
    password: "",
    host: "",
    directory: "",
  })

  const [device2, setDevice2] = useState<Device>({
    username: "labrigui",
    password: "rootroot",
    host: "10.42.0.1",
    directory: "",
  })

  const [connectionResult, setConnectionResult] = useState<ConnectionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testHistory, setTestHistory] = useState<ConnectionResponse[]>([])

  const handleDeviceChange = (deviceNum: 1 | 2, field: keyof Device, value: string) => {
    if (deviceNum === 1) {
      setDevice1((prev) => ({ ...prev, [field]: value }))
    } else {
      setDevice2((prev) => ({ ...prev, [field]: value }))
    }
  }

  const testConnections = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://10.42.0.1:5000/api/test-connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device1,
          device2,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setConnectionResult(data)
      setTestHistory((prev) => [data, ...prev.slice(0, 9)]) // Keep last 10 tests
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test connections")
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return "✅"
      case "failed":
        return "❌"
      case "timeout":
        return "⏱️"
      default:
        return "❓"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "#27ae60"
      case "failed":
        return "#e74c3c"
      case "timeout":
        return "#f39c12"
      default:
        return "#7f8c8d"
    }
  }

  return (
    <div className="connection-test">
      <div className="test-header">
        <h2>Connection Test</h2>
        <p>Test SSH connectivity to configured devices</p>
      </div>

      <div className="device-config">
        <div className="device-panel">
          <h3>Device 1 Configuration</h3>
          <div className="config-grid">
            <input
              type="text"
              placeholder="Username"
              value={device1.username}
              onChange={(e) => handleDeviceChange(1, "username", e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={device1.password}
              onChange={(e) => handleDeviceChange(1, "password", e.target.value)}
            />
            <input
              type="text"
              placeholder="Host IP"
              value={device1.host}
              onChange={(e) => handleDeviceChange(1, "host", e.target.value)}
            />
            <input
              type="text"
              placeholder="Directory Path"
              value={device1.directory}
              onChange={(e) => handleDeviceChange(1, "directory", e.target.value)}
            />
          </div>
        </div>

        <div className="device-panel">
          <h3>Device 2 Configuration</h3>
          <div className="config-grid">
            <input
              type="text"
              placeholder="Username"
              value={device2.username}
              onChange={(e) => handleDeviceChange(2, "username", e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={device2.password}
              onChange={(e) => handleDeviceChange(2, "password", e.target.value)}
            />
            <input
              type="text"
              placeholder="Host IP"
              value={device2.host}
              onChange={(e) => handleDeviceChange(2, "host", e.target.value)}
            />
            <input
              type="text"
              placeholder="Directory Path"
              value={device2.directory}
              onChange={(e) => handleDeviceChange(2, "directory", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="test-actions">
        <button onClick={testConnections} disabled={loading} className="test-btn">
          {loading ? "Testing..." : "🔗 Test Connections"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {connectionResult && (
        <div className="connection-result">
          <h3>Connection Test Results</h3>
          <div className="result-grid">
            <div className="device-result">
              <div className="device-header">
                <h4>Device 1</h4>
                <span className="device-host">{device1.host || "Not configured"}</span>
              </div>
              <div className="connection-status">
                <span
                  className="status-icon"
                  style={{ color: getStatusColor(connectionResult.connection_tests.device1.status) }}
                >
                  {getStatusIcon(connectionResult.connection_tests.device1.status)}
                </span>
                <span className="status-text">{connectionResult.connection_tests.device1.status.toUpperCase()}</span>
              </div>
              <div className="status-message">{connectionResult.connection_tests.device1.message}</div>
            </div>

            <div className="device-result">
              <div className="device-header">
                <h4>Device 2</h4>
                <span className="device-host">{device2.host || "Not configured"}</span>
              </div>
              <div className="connection-status">
                <span
                  className="status-icon"
                  style={{ color: getStatusColor(connectionResult.connection_tests.device2.status) }}
                >
                  {getStatusIcon(connectionResult.connection_tests.device2.status)}
                </span>
                <span className="status-text">{connectionResult.connection_tests.device2.status.toUpperCase()}</span>
              </div>
              <div className="status-message">{connectionResult.connection_tests.device2.message}</div>
            </div>
          </div>

          <div className="test-summary">
            <div className="summary-item">
              <span className="summary-label">Overall Status:</span>
              <span className="summary-value">{connectionResult.status}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Test Time:</span>
              <span className="summary-value">{new Date(connectionResult.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {testHistory.length > 0 && (
        <div className="test-history">
          <h3>Test History</h3>
          <div className="history-list">
            {testHistory.map((test, index) => (
              <div key={index} className="history-item">
                <div className="history-header">
                  <span className="history-time">{new Date(test.timestamp).toLocaleString()}</span>
                  <span className="history-status">{test.status}</span>
                </div>
                <div className="history-devices">
                  <span className="device-status">
                    Device 1: {getStatusIcon(test.connection_tests.device1.status)}{" "}
                    {test.connection_tests.device1.status}
                  </span>
                  <span className="device-status">
                    Device 2: {getStatusIcon(test.connection_tests.device2.status)}{" "}
                    {test.connection_tests.device2.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
