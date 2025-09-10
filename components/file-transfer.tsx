"use client"

import { useState } from "react"

interface Device {
  username: string
  password: string
  host: string
  directory: string
}

interface TransferResponse {
  direction: string
  status: string
  timestamp: string
  transfer_details: {
    destination_path: string
    file_size: number
    source_path: string
    success: boolean
    transfer_time: string
  }
}

export default function FileTransfer() {
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

  const [sourcePath, setSourcePath] = useState("")
  const [destPath, setDestPath] = useState("")
  const [direction, setDirection] = useState<"device1_to_device2" | "device2_to_device1">("device1_to_device2")
  const [transferResult, setTransferResult] = useState<TransferResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transferHistory, setTransferHistory] = useState<TransferResponse[]>([])

  const handleDeviceChange = (deviceNum: 1 | 2, field: keyof Device, value: string) => {
    if (deviceNum === 1) {
      setDevice1((prev) => ({ ...prev, [field]: value }))
    } else {
      setDevice2((prev) => ({ ...prev, [field]: value }))
    }
  }

  const transferFile = async () => {
    if (!sourcePath || !destPath) {
      setError("Please provide both source and destination paths")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://10.42.0.1:5000/api/transfer-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device1,
          device2,
          source_path: sourcePath,
          dest_path: destPath,
          direction,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setTransferResult(data)
      setTransferHistory((prev) => [data, ...prev.slice(0, 9)]) // Keep last 10 transfers
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer file")
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    if (bytes === 0) return "0 Bytes"
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
  }

  const swapDirection = () => {
    setDirection((prev) => (prev === "device1_to_device2" ? "device2_to_device1" : "device1_to_device2"))
    // Optionally swap source and dest paths
    const tempPath = sourcePath
    setSourcePath(destPath)
    setDestPath(tempPath)
  }

  return (
    <div className="file-transfer">
      <div className="transfer-header">
        <h2>File Transfer</h2>
        <p>Securely transfer files between connected devices</p>
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

      <div className="transfer-config">
        <div className="transfer-direction">
          <h3>Transfer Direction</h3>
          <div className="direction-selector">
            <div className={`direction-option ${direction === "device1_to_device2" ? "active" : ""}`}>
              <button onClick={() => setDirection("device1_to_device2")} className="direction-btn">
                Device 1 → Device 2
              </button>
            </div>
            <button onClick={swapDirection} className="swap-btn">
              🔄
            </button>
            <div className={`direction-option ${direction === "device2_to_device1" ? "active" : ""}`}>
              <button onClick={() => setDirection("device2_to_device1")} className="direction-btn">
                Device 2 → Device 1
              </button>
            </div>
          </div>
        </div>

        <div className="path-config">
          <div className="path-input">
            <label>Source Path</label>
            <input
              type="text"
              placeholder="/path/to/source/file.txt"
              value={sourcePath}
              onChange={(e) => setSourcePath(e.target.value)}
            />
          </div>
          <div className="path-input">
            <label>Destination Path</label>
            <input
              type="text"
              placeholder="/path/to/destination/file.txt"
              value={destPath}
              onChange={(e) => setDestPath(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="transfer-actions">
        <button onClick={transferFile} disabled={loading || !sourcePath || !destPath} className="transfer-btn">
          {loading ? "Transferring..." : "🚀 Start Transfer"}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {transferResult && (
        <div className="transfer-result">
          <h3>Transfer Result</h3>
          <div className={`result-card ${transferResult.status === "success" ? "success" : "error"}`}>
            <div className="result-header">
              <span className="result-status">
                {transferResult.status === "success" ? "✅" : "❌"}
                {transferResult.status.toUpperCase()}
              </span>
              <span className="result-direction">{transferResult.direction}</span>
            </div>

            {transferResult.transfer_details && (
              <div className="transfer-details">
                <div className="detail-item">
                  <span className="detail-label">Source:</span>
                  <span className="detail-value">{transferResult.transfer_details.source_path}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Destination:</span>
                  <span className="detail-value">{transferResult.transfer_details.destination_path}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">File Size:</span>
                  <span className="detail-value">{formatFileSize(transferResult.transfer_details.file_size)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Transfer Time:</span>
                  <span className="detail-value">
                    {new Date(transferResult.transfer_details.transfer_time).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {transferHistory.length > 0 && (
        <div className="transfer-history">
          <h3>Transfer History</h3>
          <div className="history-list">
            {transferHistory.map((transfer, index) => (
              <div key={index} className={`history-item ${transfer.status === "success" ? "success" : "error"}`}>
                <div className="history-header">
                  <span className="history-status">{transfer.status === "success" ? "✅" : "❌"}</span>
                  <span className="history-direction">{transfer.direction}</span>
                  <span className="history-time">{new Date(transfer.timestamp).toLocaleTimeString()}</span>
                </div>
                {transfer.transfer_details && (
                  <div className="history-details">
                    <span className="history-file">
                      {transfer.transfer_details.source_path.split("/").pop()}(
                      {formatFileSize(transfer.transfer_details.file_size)})
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
