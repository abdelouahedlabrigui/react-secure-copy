"use client"

import { useState, useEffect } from "react"
import Navbar from "../components/navbar"
import FileExplorer from "../components/file-explorer"
import FileTransfer from "../components/file-transfer"
import CommandExecutor from "../components/command-executor"
import ConnectionTest from "../components/connection-test"
import "./globals.css"

interface ProcessAnomaly {
  cmdline: string[]
  name: string
  pid: number
  timestamp: string
  type: string
}

interface HighResourceProcess {
  cpu_percent: number
  memory_percent: number
  name: string
  pid: number
}

interface NetworkProcess {
  connections: number
  name: string
  pid: number
}

interface SuspiciousProcess {
  cmdline: string[]
  name: string
  pid: number
}

interface ProcessScan {
  high_resource_processes: HighResourceProcess[]
  network_processes: NetworkProcess[]
  suspicious_processes: SuspiciousProcess[]
  timestamp: string
  total_processes: number
}

interface DiskInfo {
  free: number
  percent: number
  total: number
  used: number
}

interface ResourceMonitoring {
  anomalies: any[]
  cpu_usage: number
  disk_usage: Record<string, DiskInfo>
  load_average: number[]
  memory_usage: number
  network_connections: number
  timestamp: string
}

interface SystemInfo {
  hostname: string
  release: string
  system: string
}

interface SystemFile {
  mtime: number
  permissions: string
  size: number
}

interface SystemIntegrity {
  file_integrity: Record<string, any>
  permissions: {
    world_writable: string[]
  }
  system_files: Record<string, SystemFile>
  timestamp: string
}

interface MonitoringData {
  process_anomalies: ProcessAnomaly[]
  process_scan: ProcessScan
  resource_monitoring: ResourceMonitoring
  system_info: SystemInfo
  system_integrity: SystemIntegrity
  timestamp: string
}

export default function App() {
  const [activeTab, setActiveTab] = useState("monitor")
  const [data, setData] = useState<MonitoringData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchData = async () => {
    try {
      setError(null)
      const response = await fetch("http://localhost:5000/system_security_monitor")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
      setLastUpdate(new Date())
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "monitor") {
      fetchData()
    }
  }, [activeTab])

  useEffect(() => {
    if (!autoRefresh || activeTab !== "monitor") return

    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, activeTab])

  const formatBytes = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "#e74c3c"
    if (value >= thresholds.warning) return "#f39c12"
    return "#27ae60"
  }

  const renderContent = () => {
    switch (activeTab) {
      case "files":
        return <FileExplorer />
      case "transfer":
        return <FileTransfer />
      case "command":
        return <CommandExecutor />
      case "connections":
        return <ConnectionTest />
      case "monitor":
      default:
        return renderMonitorContent()
    }
  }

  const renderMonitorContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading system monitoring data...</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchData} className="retry-button">
            Retry
          </button>
        </div>
      )
    }

    if (!data) return null

    return (
      <div className="monitor-content">
        <div className="monitor-header">
          <div className="header-controls">
            <div className="last-update">Last Update: {lastUpdate?.toLocaleTimeString()}</div>
            <label className="auto-refresh-toggle">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto Refresh
            </label>
            <button onClick={fetchData} className="refresh-button">
              Refresh Now
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* System Info */}
          <div className="card system-info">
            <h2>System Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Hostname:</span>
                <span className="value">{data.system_info.hostname}</span>
              </div>
              <div className="info-item">
                <span className="label">System:</span>
                <span className="value">{data.system_info.system}</span>
              </div>
              <div className="info-item">
                <span className="label">Release:</span>
                <span className="value">{data.system_info.release}</span>
              </div>
            </div>
          </div>

          {/* Resource Monitoring */}
          <div className="card resource-monitoring">
            <h2>Resource Monitoring</h2>
            <div className="resource-grid">
              <div className="resource-item">
                <div className="resource-header">
                  <span className="resource-label">CPU Usage</span>
                  <span
                    className="resource-value"
                    style={{ color: getStatusColor(data.resource_monitoring.cpu_usage, { warning: 70, critical: 90 }) }}
                  >
                    {data.resource_monitoring.cpu_usage}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${data.resource_monitoring.cpu_usage}%`,
                      backgroundColor: getStatusColor(data.resource_monitoring.cpu_usage, {
                        warning: 70,
                        critical: 90,
                      }),
                    }}
                  ></div>
                </div>
              </div>

              <div className="resource-item">
                <div className="resource-header">
                  <span className="resource-label">Memory Usage</span>
                  <span
                    className="resource-value"
                    style={{
                      color: getStatusColor(data.resource_monitoring.memory_usage, { warning: 70, critical: 90 }),
                    }}
                  >
                    {data.resource_monitoring.memory_usage}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${data.resource_monitoring.memory_usage}%`,
                      backgroundColor: getStatusColor(data.resource_monitoring.memory_usage, {
                        warning: 70,
                        critical: 90,
                      }),
                    }}
                  ></div>
                </div>
              </div>

              <div className="resource-item">
                <span className="resource-label">Load Average:</span>
                <span className="resource-value">
                  {data.resource_monitoring.load_average.map((load) => load.toFixed(2)).join(", ")}
                </span>
              </div>

              <div className="resource-item">
                <span className="resource-label">Network Connections:</span>
                <span className="resource-value">{data.resource_monitoring.network_connections}</span>
              </div>
            </div>

            <div className="disk-usage">
              <h3>Disk Usage</h3>
              {Object.entries(data.resource_monitoring.disk_usage).map(([mount, disk]) => (
                <div key={mount} className="disk-item">
                  <div className="disk-header">
                    <span className="disk-mount">{mount}</span>
                    <span className="disk-percent">{disk.percent.toFixed(1)}%</span>
                  </div>
                  <div className="disk-details">
                    <span>Used: {formatBytes(disk.used)}</span>
                    <span>Free: {formatBytes(disk.free)}</span>
                    <span>Total: {formatBytes(disk.total)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${disk.percent}%`,
                        backgroundColor: getStatusColor(disk.percent, { warning: 80, critical: 95 }),
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Process Anomalies */}
          <div className="card process-anomalies">
            <h2>Process Anomalies ({data.process_anomalies.length})</h2>
            {data.process_anomalies.length === 0 ? (
              <p className="no-data">No process anomalies detected</p>
            ) : (
              <div className="anomaly-list">
                {data.process_anomalies.map((anomaly, index) => (
                  <div key={index} className={`anomaly-item ${anomaly.type}`}>
                    <div className="anomaly-header">
                      <span className="anomaly-name">{anomaly.name}</span>
                      <span className="anomaly-type">{anomaly.type}</span>
                      <span className="anomaly-pid">PID: {anomaly.pid}</span>
                    </div>
                    <div className="anomaly-cmdline">{anomaly.cmdline.join(" ") || "No command line available"}</div>
                    <div className="anomaly-timestamp">{formatTimestamp(anomaly.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* High Resource Processes */}
          <div className="card high-resource-processes">
            <h2>High Resource Processes</h2>
            <div className="process-table">
              <div className="table-header">
                <span>Process</span>
                <span>PID</span>
                <span>CPU %</span>
                <span>Memory %</span>
              </div>
              {data.process_scan.high_resource_processes.map((process, index) => (
                <div key={index} className="table-row">
                  <span className="process-name">{process.name}</span>
                  <span>{process.pid}</span>
                  <span style={{ color: getStatusColor(process.cpu_percent, { warning: 50, critical: 80 }) }}>
                    {process.cpu_percent.toFixed(1)}%
                  </span>
                  <span style={{ color: getStatusColor(process.memory_percent, { warning: 10, critical: 20 }) }}>
                    {process.memory_percent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Process Summary */}
          <div className="card process-summary">
            <h2>Process Summary</h2>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-value">{data.process_scan.total_processes}</span>
                <span className="stat-label">Total Processes</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{data.process_scan.suspicious_processes.length}</span>
                <span className="stat-label">Suspicious</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{data.process_scan.high_resource_processes.length}</span>
                <span className="stat-label">High Resource</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{data.process_scan.network_processes.length}</span>
                <span className="stat-label">Network Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">{renderContent()}</main>
    </div>
  )
}
