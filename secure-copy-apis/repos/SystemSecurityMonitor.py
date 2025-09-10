#!/usr/bin/env python3
"""
System Security Monitor for Oracle Linux
Monitors system processes, resource usage, and potential security anomalies
"""

import os
import pandas as pd
import psutil
import subprocess
import logging
import hashlib
import time
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import json
import threading
from pathlib import Path
import oracledb
from repos.databases.OracleDbHandler import OracleDBHandler


class SystemSecurityMonitor:
    def __init__(self, log_file: str = "/tmp/security_monitor.log", insert_state: str = "false"):
        """
        Initialize the security monitor
        
        Args:
            log_file: Path to the log file for security events
        """
        self.insert_state = insert_state
        self.log_file = log_file
        self.baseline_processes = set()
        self.baseline_cpu_usage = 0.0
        self.baseline_memory_usage = 0.0
        self.suspicious_processes = []
        self.known_malicious_hashes = set()
        self.monitoring = False
        self.db_handler = OracleDBHandler(user="sys", password="oracle", dsn="10.42.0.243:1521/FREE")
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Initialize baseline
        self._establish_baseline()
        

        
    def _establish_baseline(self):
        """Establish baseline system metrics"""
        try:
            # Get current processes
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    self.baseline_processes.add(proc.info['name'])
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
            # Get baseline resource usage
            self.baseline_cpu_usage = psutil.cpu_percent(interval=1)
            self.baseline_memory_usage = psutil.virtual_memory().percent
            
            self.logger.info(f"Baseline established: {len(self.baseline_processes)} processes, "
                           f"CPU: {self.baseline_cpu_usage}%, Memory: {self.baseline_memory_usage}%")
        except Exception as e:
            self.logger.error(f"Error establishing baseline: {e}")
    
    def detect_process_anomalies(self) -> List[Dict]:
        """
        Detect anomalous processes based on resource usage and behavior
        
        Returns:
            List of suspicious process information
        """
        anomalies = []
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_percent']):
                try:
                    proc_info = proc.info
                    
                    # Skip system processes
                    if proc_info['pid'] < 100:
                        continue
                    
                    # Check for high resource usage
                    if proc_info['cpu_percent'] > 50 or proc_info['memory_percent'] > 25:
                        anomalies.append({
                            'type': 'high_resource_usage',
                            'pid': proc_info['pid'],
                            'name': proc_info['name'],
                            'cmdline': proc_info['cmdline'],
                            'cpu_percent': proc_info['cpu_percent'],
                            'memory_percent': proc_info['memory_percent'],
                            'timestamp': datetime.now().isoformat()
                        })
                    
                    # Check for new processes not in baseline
                    if proc_info['name'] not in self.baseline_processes:
                        anomalies.append({
                            'type': 'new_process',
                            'pid': proc_info['pid'],
                            'name': proc_info['name'],
                            'cmdline': proc_info['cmdline'],
                            'timestamp': datetime.now().isoformat()
                        })
                    
                    # Check for suspicious process names/paths
                    if self._is_suspicious_process(proc_info):
                        anomalies.append({
                            'type': 'suspicious_process',
                            'pid': proc_info['pid'],
                            'name': proc_info['name'],
                            'cmdline': proc_info['cmdline'],
                            'timestamp': datetime.now().isoformat()
                        })
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            if self.insert_state == "true":
                self.db_handler.insert_anomalies_into_db(anomalies)
        except Exception as e:
            self.logger.error(f"Error detecting process anomalies: {e}")
        if self.insert_state == "true":
            self.db_handler.insert_anomalies_into_db(anomalies=anomalies)
        return anomalies
    
    def _is_suspicious_process(self, proc_info: Dict) -> bool:
        """Check if a process exhibits suspicious characteristics"""
        suspicious_indicators = [
            # Hidden or obfuscated names
            proc_info['name'].startswith('.'),
            # Unusual locations
            any(suspicious_path in str(proc_info['cmdline']) for suspicious_path in ['/tmp/', '/var/tmp/', '/dev/shm/']),
            # Common malware names (generic indicators)
            proc_info['name'].lower() in ['sshd', 'systemd', 'kthreadd'] and proc_info['pid'] > 1000,
            # Processes with random-looking names
            len(proc_info['name']) > 15 and proc_info['name'].isalnum() and not proc_info['name'].islower()
        ]
        
        return any(suspicious_indicators)
    
    def scan_running_processes(self) -> Dict:
        """
        Comprehensive scan of running processes
        
        Returns:
            Dictionary with process analysis results
        """
        results = {
            'total_processes': 0,
            'suspicious_processes': [],
            'high_resource_processes': [],
            'network_processes': [],
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_percent']):
                try:
                    proc_info = proc.info
                    results['total_processes'] += 1

                    # Check for high resource usage
                    if proc_info['cpu_percent'] > 30 or proc_info['memory_percent'] > 20:
                        results['high_resource_processes'].append({
                            'pid': proc_info['pid'],
                            'name': proc_info['name'],
                            'cpu_percent': proc_info['cpu_percent'],
                            'memory_percent': proc_info['memory_percent']
                        })

                    # Check for network connections
                    try:
                        connections = proc.net_connections()
                        if connections:
                            results['network_processes'].append({
                                'pid': proc_info['pid'],
                                'name': proc_info['name'],
                                'connections': len(connections)
                            })
                    except (psutil.AccessDenied, psutil.NoSuchProcess):
                        continue

                    # Check for suspicious processes
                    if self._is_suspicious_process(proc_info):
                        results['suspicious_processes'].append({
                            'pid': proc_info['pid'],
                            'name': proc_info['name'],
                            'cmdline': proc_info['cmdline']
                        })

                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            if self.insert_state == "true":
                self.db_handler._insert_results_to_db(results)
                    
        except Exception as e:
            self.logger.error(f"Error scanning processes: {e}")
            
        return results
    
    def check_system_integrity(self) -> Dict:
        """
        Check system integrity using various methods
        
        Returns:
            Dictionary with integrity check results
        """
        results = {
            'file_integrity': {},
            'system_files': {},
            'permissions': {},
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            # Check critical system files
            critical_files = [
                '/etc/passwd',
                '/etc/shadow',
                '/etc/hosts',
                '/etc/crontab',
                '/etc/sudoers'
            ]
            
            for file_path in critical_files:
                if os.path.exists(file_path):
                    stat_info = os.stat(file_path)
                    results['system_files'][file_path] = {
                        'size': stat_info.st_size,
                        'mtime': stat_info.st_mtime,
                        'permissions': oct(stat_info.st_mode)[-3:]
                    }
            
            # Check for world-writable files in sensitive directories
            sensitive_dirs = ['/etc', '/usr/bin', '/usr/sbin']
            world_writable = []
            
            for dir_path in sensitive_dirs:
                if os.path.exists(dir_path):
                    for root, dirs, files in os.walk(dir_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            try:
                                if os.stat(file_path).st_mode & 0o002:
                                    world_writable.append(file_path)
                            except (OSError, PermissionError):
                                continue
            
            results['permissions']['world_writable'] = world_writable
            if self.insert_state == "true":
                self.db_handler._insert_integrity_results_to_db(results)
        except Exception as e:
            self.logger.error(f"Error checking system integrity: {e}")
            
        return results
    
    def monitor_system_resources(self) -> Dict:
        """
        Monitor system resource usage for anomalies
        
        Returns:
            Dictionary with resource monitoring results
        """
        results = {
            'cpu_usage': psutil.cpu_percent(interval=1),
            'memory_usage': psutil.virtual_memory().percent,
            'disk_usage': {},
            'network_connections': len(psutil.net_connections()),
            'load_average': os.getloadavg(),
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            # Get disk usage for all mounted filesystems
            for partition in psutil.disk_partitions():
                try:
                    usage = psutil.disk_usage(partition.mountpoint)
                    results['disk_usage'][partition.mountpoint] = {
                        'total': usage.total,
                        'used': usage.used,
                        'free': usage.free,
                        'percent': (usage.used / usage.total) * 100
                    }
                except PermissionError:
                    continue
            
            # Check for anomalies
            anomalies = []
            
            if results['cpu_usage'] > self.baseline_cpu_usage * 2:
                anomalies.append('high_cpu_usage')
            
            if results['memory_usage'] > self.baseline_memory_usage * 1.5:
                anomalies.append('high_memory_usage')
            
            if results['load_average'][0] > 5.0:
                anomalies.append('high_load_average')
            
            results['anomalies'] = anomalies
            if self.insert_state == "true":
                self.db_handler._insert_resource_results_to_db(results)
        except Exception as e:
            self.logger.error(f"Error monitoring system resources: {e}")
            
        return results
    
    def generate_security_report(self) -> Dict:
        """
        Generate a comprehensive security report
        
        Returns:
            Dictionary with complete security analysis
        """
        report = {
            'timestamp': datetime.now().isoformat(),
            'system_info': {
                'hostname': os.uname().nodename,
                'system': os.uname().sysname,
                'release': os.uname().release
            },
            'process_anomalies': self.detect_process_anomalies(),
            'process_scan': self.scan_running_processes(),
            'system_integrity': self.check_system_integrity(),
            'resource_monitoring': self.monitor_system_resources()
        }
        
        # Log critical findings
        critical_issues = []
        
        if len(report['process_anomalies']) > 0:
            critical_issues.append(f"Found {len(report['process_anomalies'])} process anomalies")
        
        if len(report['process_scan']['suspicious_processes']) > 0:
            critical_issues.append(f"Found {len(report['process_scan']['suspicious_processes'])} suspicious processes")
        
        if report['resource_monitoring']['anomalies']:
            critical_issues.append(f"Resource anomalies: {', '.join(report['resource_monitoring']['anomalies'])}")
        
        if critical_issues:
            self.logger.warning(f"SECURITY ALERT: {'; '.join(critical_issues)}")
        else:
            self.logger.info("Security scan completed - no critical issues found")
        
        return report
    
    def start_monitoring(self, interval: int = 60):
        """
        Start continuous monitoring
        
        Args:
            interval: Monitoring interval in seconds
        """
        self.monitoring = True
        self.logger.info(f"Starting continuous monitoring with {interval}s interval")
        
        def monitor_loop():
            while self.monitoring:
                try:
                    report = self.generate_security_report()
                    
                    # Save report to file
                    report_file = f"/tmp/security_report_{int(time.time())}.json"
                    with open(report_file, 'w') as f:
                        json.dump(report, f, indent=2)
                    
                    time.sleep(interval)
                    
                except Exception as e:
                    self.logger.error(f"Error in monitoring loop: {e}")
                    time.sleep(interval)
        
        monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
        monitor_thread.start()
        
        return monitor_thread
    
    def stop_monitoring(self):
        """Stop continuous monitoring"""
        self.monitoring = False
        self.logger.info("Stopping continuous monitoring")

# if __name__ == "__main__":
#     import logging

#     # Setup custom Oracle DB handler
#     db_handler = OracleDBHandler(user="sys", password="oracle", dsn="10.42.0.243:1521/FREE")
#     db_handler.setLevel(logging.INFO)
#     db_handler.setFormatter(logging.Formatter('%(message)s'))

#     # Setup logger
#     logger = logging.getLogger("SecurityLogger")
#     logger.setLevel(logging.INFO)
#     logger.addHandler(db_handler)

#     # Initialize the security monitor
#     monitor = SystemSecurityMonitor(log_file="/tmp/security_monitor.log")
#     monitor.logger = logger  # Override logger with DB-aware one

#     # Generate one-time security report
#     print("Generating security report...")
#     report = monitor.generate_security_report()

#     # Insert metrics to Oracle
#     db_handler.insert_process_metric("CPU_Usage", report['resource_monitoring']['cpu_usage'])
#     db_handler.insert_process_metric("Memory_Usage", report['resource_monitoring']['memory_usage'])

#     # Print summary
#     print(f"\nSecurity Report Summary:")
#     print(f"- Total processes: {report['process_scan']['total_processes']}")
#     print(f"- Suspicious processes: {len(report['process_scan']['suspicious_processes'])}")
#     print(f"- Process anomalies: {len(report['process_anomalies'])}")
#     print(f"- CPU usage: {report['resource_monitoring']['cpu_usage']:.1f}%")
#     print(f"- Memory usage: {report['resource_monitoring']['memory_usage']:.1f}%")

#     # Start monitoring
#     monitor.start_monitoring(interval=60)

#     try:
#         while True:
#             time.sleep(1)
#     except KeyboardInterrupt:
#         monitor.stop_monitoring()
#         db_handler.close()
#         print("\nMonitoring stopped.")
