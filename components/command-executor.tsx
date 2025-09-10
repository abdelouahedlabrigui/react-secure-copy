"use client"

import type React from "react"

import { useState } from "react"

interface Device {
  username: string
  password: string
  host: string
  directory: string
}

interface CommandResponse {
  command: string
  device: string
  result: {
    exit_code: number
    stderr: string
    stdout: string
  }
  status: string
  timestamp: string
}

export default function CommandExecutor() {
  const [device1, setDevice1] = useState<Device>({
    username: "labrigui",
    password: "rootroot",
    host: "10.42.0.243",
    directory: "/home/labrigui/Documents",
  })

  const [command, setCommand] = useState("")
  const [selectedDevice, setSelectedDevice] = useState<"device1">("device1")
  const [commandResult, setCommandResult] = useState<CommandResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commandHistory, setCommandHistory] = useState<CommandResponse[]>([])

  const commonCommands = ["ls -la", "pwd", "whoami", "df -h", "free -h", "ps aux", "netstat -tulpn", "uname -a"]

  const handleDeviceChange = (field: keyof Device, value: string) => {
    setDevice1((prev) => ({ ...prev, [field]: value }))
  }

  const executeCommand = async () => {
    if (!command.trim()) {
      setError("Please enter a command")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("http://10.42.0.1:5000/api/execute-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device: selectedDevice,
          command: command.trim(),
          device1,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setCommandResult(data)
      setCommandHistory((prev) => [data, ...prev.slice(0, 19)]) // Keep last 20 commands
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to execute command")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      executeCommand()
    }
  }

  const insertCommand = (cmd: string) => {
    setCommand(cmd)
  }

  return (
    <div className="command-executor">
      <div className="executor-header">
        <h2>Command Executor</h2>
        <p>Execute commands remotely on connected devices</p>
      </div>

      <div className="device-config">
        <div className="device-panel">
          <h3>Device Configuration</h3>
          <div className="config-grid">
            <input
              type="text"
              placeholder="Username"
              value={device1.username}
              onChange={(e) => handleDeviceChange("username", e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={device1.password}
              onChange={(e) => handleDeviceChange("password", e.target.value)}
            />
            <input
              type="text"
              placeholder="Host IP"
              value={device1.host}
              onChange={(e) => handleDeviceChange("host", e.target.value)}
            />
            <input
              type="text"
              placeholder="Working Directory"
              value={device1.directory}
              onChange={(e) => handleDeviceChange("directory", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="command-input-section">
        <div className="common-commands">
          <h3>Common Commands</h3>
          <div className="command-buttons">
            {commonCommands.map((cmd, index) => (
              <button key={index} onClick={() => insertCommand(cmd)} className="command-btn">
                {cmd}
              </button>
            ))}
          </div>
        </div>

        <div className="command-input">
          <label>Command</label>
          <div className="input-wrapper">
            <textarea
              placeholder="Enter command to execute... (Ctrl+Enter to run)"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={3}
            />
            <button onClick={executeCommand} disabled={loading || !command.trim()} className="execute-btn">
              {loading ? "Executing..." : "▶️ Execute"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {commandResult && (
        <div className="command-result">
          <h3>Command Result</h3>
          <div className={`result-card ${commandResult.status === "success" ? "success" : "error"}`}>
            <div className="result-header">
              <span className="result-command">$ {commandResult.command}</span>
              <span className="result-device">Device: {commandResult.device}</span>
              <span className="result-time">{new Date(commandResult.timestamp).toLocaleString()}</span>
            </div>

            <div className="result-content">
              <div className="exit-code">
                <span className="label">Exit Code:</span>
                <span className={`code ${commandResult.result.exit_code === 0 ? "success" : "error"}`}>
                  {commandResult.result.exit_code}
                </span>
              </div>

              {commandResult.result.stdout && (
                <div className="output-section">
                  <h4>Standard Output (stdout)</h4>
                  <pre className="output stdout">{commandResult.result.stdout}</pre>
                </div>
              )}

              {commandResult.result.stderr && (
                <div className="output-section">
                  <h4>Standard Error (stderr)</h4>
                  <pre className="output stderr">{commandResult.result.stderr}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {commandHistory.length > 0 && (
        <div className="command-history">
          <h3>Command History</h3>
          <div className="history-list">
            {commandHistory.map((cmd, index) => (
              <div key={index} className={`history-item ${cmd.status === "success" ? "success" : "error"}`}>
                <div className="history-header">
                  <span className="history-command">$ {cmd.command}</span>
                  <span className="history-exit-code">Exit: {cmd.result.exit_code}</span>
                  <span className="history-time">{new Date(cmd.timestamp).toLocaleTimeString()}</span>
                </div>
                <button onClick={() => insertCommand(cmd.command)} className="rerun-btn">
                  🔄 Rerun
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
