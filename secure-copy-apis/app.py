from datetime import datetime
from flask import Flask, json, jsonify, request
from urllib.parse import unquote
import requests
from flask_cors import CORS
from repos.securecopy.SecureCopy import DatabaseManager, DeviceConfig, SSHManager, SCPManager
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


import subprocess

app = Flask(__name__)

CORS(app, origins=["http://10.42.0.1:4200", "http://10.0.0.1:4200", "http://localhost:4200", "http://10.0.0.243:3000", "http://10.42.0.243:3000", "http://10.42.0.1:3000", "http://localhost:3000", "http://10.0.0.1:3000"])


from repos.SystemSecurityMonitor import SystemSecurityMonitor
from repos.databases.OracleDbHandler import OracleDBHandler

@app.route("/system_security_monitor", methods=["GET"])
def system_security_monitor():
    try:
        # Setup custom Oracle DB handler
        db_handler = OracleDBHandler(user="sys", password="oracle", dsn="10.42.0.243:1521/FREE")
        db_handler.setLevel(logging.INFO)
        db_handler.setFormatter(logging.Formatter('%(message)s'))

        # Setup logger
        security_logger = logging.getLogger("SecurityLogger")
        security_logger.setLevel(logging.INFO)
        security_logger.addHandler(db_handler)

        monitor = SystemSecurityMonitor(insert_state="false")
        monitor.logger = security_logger  # Override logger with DB-aware one
        report = monitor.generate_security_report()
        if isinstance(report, dict):
            return jsonify(report), 200
        else:
            endpoint: str = "/system_security_monitor"
            logger.warning(f"Data structure doesn't match | endpoint: {endpoint} | at {datetime.now().isoformat()}")
            return jsonify({"status": "error", "message": f"Data structure doesn't match | endpoint: {endpoint} | at {datetime.now().isoformat()}"}), 500
    except Exception as e:
        endpoint: str = "/system_security_monitor"
        logger.debug(f"Error: {e} | endpoint: {endpoint} | at {datetime.now().isoformat()}")
        return jsonify({"status": "error", "message": f"Error: {e} | endpoint: {endpoint} | at {datetime.now().isoformat()}"}), 500


DB_CONFIG = {
    "dsn": "10.42.0.243:1521/FREE",
    "username": "SYS",
    "password": "oracle"
}

from functools import wraps
db_manager = DatabaseManager(**DB_CONFIG)

def log_api_call(operation_type: str):
    """Decorator to log API calls to database"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            request_data = request.get_json() if request.is_json else {}
            device_info = {
                "device1": request_data.get("device1", {}).get("host", "unknown"),
                "device2": request_data.get("device2", {}).get("host", "unknown")
            }

            try:
                response = f(*args, **kwargs)
                status = "success" if response[1] == 200 else "error"

                db_manager.log_operation(
                    operation_type, device_info, request_data, response[0].get_json(), status
                )

                return response
            except Exception as e:
                error_response = {"error": str(e)}
                db_manager.log_operation(
                    operation_type, device_info, request_data, error_response, "error"
                )
                raise
        return decorated_function
    return decorator

@app.route("/api/list-files", methods=["POST"])
@log_api_call("list_files")
def list_files():
    """List files and directories on both devices"""
    try:
        data = request.get_json()

        # Extract device configurations
        device1_config = DeviceConfig(**data["device1"])
        device2_config = DeviceConfig(**data["device2"])

        result = {"device1": [], "device2": []}

        # List files on device1
        try:
            client1 = SSHManager.create_ssh_client(device1_config)
            command1 = f"find {device1_config.directory}"
            stdout1, stderr1, exit_code1 = SSHManager.execute_command(client1, command1)
            client1.close()

            if exit_code1 == 0:
                result["device1"] = [path.strip() for path in stdout1.split("\n") if path.strip()]
            else:
                result["device1"] = [f"Error: {stderr1}"]
        except Exception as e:
            result["device1"] = [f"Connection error: {str(e)}"]

        # List files on device2
        try:
            client2 = SSHManager.create_ssh_client(device2_config)
            command2 = f"find {device2_config.directory}"
            stdout2, stderr2, exit_code2 = SSHManager.execute_command(client2, command2)
            client1.close()

            if exit_code2 == 0:
                result["device2"] = [path.strip() for path in stdout2.split("\n") if path.strip()]
            else:
                result["device2"] = [f"Error: {stderr2}"]
        except Exception as e:
            result["device2"] = [f"Connection error: {str(e)}"]


        return jsonify({
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "data": result
        }), 200

    except Exception as e:
        logger.error(f"List files operations failed: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route("/api/transfer-file", methods=["POST"])
@log_api_call('transfer_file')
def transfer_file():
    """Transfer file from device1 to device2 or vice versa"""
    try:
        data = request.get_json()

        device1_config = DeviceConfig(**data["device1"])
        device2_config = DeviceConfig(**data["device2"])

        source_path = data["source_path"]
        dest_path = data["dest_path"]
        direction = data.get("direction", "device1_to_device2") # or 'device2_to_device1

        if direction == "device1_to_device2":
            source_device = device1_config
            dest_device = device2_config
        else:
            source_device = device2_config
            dest_device = device1_config

        transfer_result = SCPManager.transfer_file(source_device, dest_device, source_path, dest_path)

        return jsonify({
            "status": "success" if transfer_result["success"] else "error",
            "timestamp": datetime.now().isoformat(),
            "transfer_details": transfer_result,
            "direction": direction
        }), 200 if transfer_result["success"] else 500
    except Exception as e:
        logger.error(f"File transfer operation failed: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500
    
@app.route("/api/execute-command", methods=["POST"])
@log_api_call("execute_command")
def execute_command():
    """Execute custom command on specified device"""
    try:
        data = request.get_json()

        device_name = data["device"] # 'device1' or 'device2'
        command = data["command"]

        device_config = DeviceConfig(**data[device_name])

        client = SSHManager.create_ssh_client(device_config)
        stdout, stderr, exit_code = SSHManager.execute_command(client, command)
        client.close()

        return jsonify({
            "status": "success",
            "timestamp": datetime.now().isoformat(),
            "device": device_name,
            "command": command,
            "result": {
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": exit_code
            }
        }), 200
    except Exception as e:
        logger.error(f"Command execution failed: {str(e)}") 
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "service": "SSH/SCP API"
    }), 200

@app.route('/api/test-connections', methods=['POST'])
@log_api_call('test_connections')
def test_connections():
    """Test SSH connections to both devices"""
    try:
        data = request.get_json()
        
        device1_config = DeviceConfig(**data['device1'])
        device2_config = DeviceConfig(**data['device2'])
        
        results = {}
        
        # Test device1 connection
        try:
            client1 = SSHManager.create_ssh_client(device1_config)
            stdout1, _, _ = SSHManager.execute_command(client1, "echo 'Connection successful'")
            client1.close()
            results['device1'] = {"status": "connected", "message": stdout1}
        except Exception as e:
            results['device1'] = {"status": "failed", "message": str(e)}
        
        # Test device2 connection
        try:
            client2 = SSHManager.create_ssh_client(device2_config)
            stdout2, _, _ = SSHManager.execute_command(client2, "echo 'Connection successful'")
            client2.close()
            results['device2'] = {"status": "connected", "message": stdout2}
        except Exception as e:
            results['device2'] = {"status": "failed", "message": str(e)}
        
        return jsonify({
            "status": "completed",
            "timestamp": datetime.now().isoformat(),
            "connection_tests": results
        }), 200
        
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)