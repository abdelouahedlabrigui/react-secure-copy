"use client"

import { useState } from "react"

interface NavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { id: "monitor", label: "System Monitor", icon: "📊" },
    { id: "files", label: "File Explorer", icon: "📁" },
    { id: "transfer", label: "File Transfer", icon: "🔄" },
    { id: "command", label: "Command Executor", icon: "💻" },
    { id: "connections", label: "Test Connections", icon: "🔗" },
  ]

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🛡️</span>
        <span className="brand-text">SecureTransfer</span>
      </div>

      <div className={`navbar-menu ${isMobileMenuOpen ? "active" : ""}`}>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? "active" : ""}`}
            onClick={() => {
              onTabChange(item.id)
              setIsMobileMenuOpen(false)
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <button className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
        <span></span>
        <span></span>
        <span></span>
      </button>
    </nav>
  )
}
