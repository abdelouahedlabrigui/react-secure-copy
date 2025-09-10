"use client"

import { useState } from "react"

interface Device {
  username: string
  password: string
  host: string
  directory: string
}

interface FileListResponse {
  data: {
    device1: string[]
    device2: string[]
  }
  status: string
  timestamp: string
}

export default function FileExplorer() {
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

  const [fileList, setFileList] = useState<FileListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<{ device1: string[]; device2: string[] }>({
    device1: [],
    device2: [],
  })

  const handleDeviceChange = (deviceNum: 1 | 2, field: keyof Device, value: string) => {
    if (deviceNum === 1) {
      setDevice1((prev) => ({ ...prev, [field]: value }))
    } else {
      setDevice2((prev) => ({ ...prev, [field]: value }))
    }
  }

  const listFiles = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://10.42.0.1:5000/api/list-files", {
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
      setFileList(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to list files")
    } finally {
      setLoading(false)
    }
  }

  const toggleFileSelection = (device: "device1" | "device2", filePath: string) => {
    setSelectedFiles((prev) => ({
      ...prev,
      [device]: prev[device].includes(filePath)
        ? prev[device].filter((f) => f !== filePath)
        : [...prev[device], filePath],
    }))
  }

  const getFileIcon = (filePath: string) => {
    if (filePath.endsWith("/")) return "📁"
    const ext = filePath.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "txt":
        return "📄"
      case "pdf":
        return "📕"
      case "jpg":
      case "jpeg":
      case "png":
        return "🖼️"
      case "mp3":
      case "wav":
        return "🎵"
      case "mp4":
      case "avi":
        return "🎬"
      default:
        return "📄"
    }
  }

  const formatFileSize = (filePath: string) => {
    // This would need to be enhanced to show actual file sizes
    return filePath.includes(".") ? "File" : "Directory"
  }

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <h2>File Explorer</h2>
        <p>Browse and select files from connected devices</p>
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

      <div className="explorer-actions">
        <button onClick={listFiles} disabled={loading} className="list-files-btn">
          {loading ? "Loading..." : "📂 List Files"}
        </button>

        {selectedFiles.device1.length > 0 || selectedFiles.device2.length > 0 ? (
          <div className="selection-info">
            Selected: {selectedFiles.device1.length + selectedFiles.device2.length} files
          </div>
        ) : null}
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {fileList && (
        <div className="file-lists">
          <div className="device-files">
            <h3>Device 1 Files ({fileList.data.device1.length})</h3>
            <div className="file-tree">
              {fileList.data.device1.map((filePath, index) => (
                <div
                  key={index}
                  className={`file-item ${selectedFiles.device1.includes(filePath) ? "selected" : ""}`}
                  onClick={() => toggleFileSelection("device1", filePath)}
                >
                  <span className="file-icon">{getFileIcon(filePath)}</span>
                  <div className="file-info">
                    <span className="file-name">{filePath.split("/").pop()}</span>
                    <span className="file-path">{filePath}</span>
                    <span className="file-type">{formatFileSize(filePath)}</span>
                  </div>
                  <div className="file-actions">
                    {selectedFiles.device1.includes(filePath) && <span className="selected-indicator">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="device-files">
            <h3>Device 2 Files ({fileList.data.device2.length})</h3>
            <div className="file-tree">
              {fileList.data.device2.map((filePath, index) => (
                <div
                  key={index}
                  className={`file-item ${selectedFiles.device2.includes(filePath) ? "selected" : ""}`}
                  onClick={() => toggleFileSelection("device2", filePath)}
                >
                  <span className="file-icon">{getFileIcon(filePath)}</span>
                  <div className="file-info">
                    <span className="file-name">{filePath.split("/").pop()}</span>
                    <span className="file-path">{filePath}</span>
                    <span className="file-type">{formatFileSize(filePath)}</span>
                  </div>
                  <div className="file-actions">
                    {selectedFiles.device2.includes(filePath) && <span className="selected-indicator">✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {fileList && (
        <div className="explorer-footer">
          <div className="timestamp">Last updated: {new Date(fileList.timestamp).toLocaleString()}</div>
        </div>
      )}
    </div>
  )
}
