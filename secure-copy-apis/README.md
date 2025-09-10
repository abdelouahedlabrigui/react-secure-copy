# Secure Copy API

This Flask API provides secure file transfer and remote command execution capabilities between two devices using SSH and SCP. It also includes system security monitoring features with logging to an Oracle database.

## Features

- **File Listing**: List files and directories on both devices.
- **File Transfer**: Transfer files securely between two devices.
- **Remote Command Execution**: Execute commands on remote devices via SSH.
- **Connection Testing**: Test SSH connections to remote devices.
- **Health Check**: Endpoint to check the service's health status.
- **System Security Monitoring**: Generates a security report and logs events to an Oracle database.
- **API Call Logging**: Logs all API calls to a database for auditing.

## Endpoints

### Health Check

- **Endpoint**: `/api/health`
- **Method**: `GET`
- **Description**: Checks the health of the API service.
- **Response**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-07-24T12:00:00.000000",
    "service": "SSH/SCP API"
  }
  ```

### List Files

- **Endpoint**: `/api/list-files`
- **Method**: `POST`
- **Description**: Lists files and directories on two specified devices.
- **Request Body**:
  ```json
  {
    "device1": {
      "host": "device1_host",
      "port": 22,
      "username": "device1_user",
      "password": "device1_password",
      "directory": "/path/to/directory"
    },
    "device2": {
      "host": "device2_host",
      "port": 22,
      "username": "device2_user",
      "password": "device2_password",
      "directory": "/path/to/directory"
    }
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "timestamp": "2024-07-24T12:00:00.000000",
    "data": {
      "device1": ["/path/to/file1", "/path/to/file2"],
      "device2": ["/path/to/file3", "/path/to/file4"]
    }
  }
  ```

### Transfer File

- **Endpoint**: `/api/transfer-file`
- **Method**: `POST`
- **Description**: Transfers a file from one device to another.
- **Request Body**:
  ```json
  {
    "device1": {
      "host": "device1_host",
      "port": 22,
      "username": "device1_user",
      "password": "device1_password"
    },
    "device2": {
      "host": "device2_host",
      "port": 22,
      "username": "device2_user",
      "password": "device2_password"
    },
    "source_path": "/path/to/source/file",
    "dest_path": "/path/to/destination/file",
    "direction": "device1_to_device2" // or "device2_to_device1"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "timestamp": "2024-07-24T12:00:00.000000",
    "transfer_details": {
      "success": true,
      "message": "File transferred successfully"
    },
    "direction": "device1_to_device2"
  }
  ```

### Execute Command

- **Endpoint**: `/api/execute-command`
- **Method**: `POST`
- **Description**: Executes a command on a specified device.
- **Request Body**:
  ```json
  {
    "device": "device1", // or "device2"
    "command": "ls -l",
    "device1": {
      "host": "device1_host",
      "port": 22,
      "username": "device1_user",
      "password": "device1_password"
    },
    "device2": {
      "host": "device2_host",
      "port": 22,
      "username": "device2_user",
      "password": "device2_password"
    }
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "timestamp": "2024-07-24T12:00:00.000000",
    "device": "device1",
    "command": "ls -l",
    "result": {
      "stdout": "...",
      "stderr": "",
      "exit_code": 0
    }
  }
  ```

### Test Connections

- **Endpoint**: `/api/test-connections`
- **Method**: `POST`
- **Description**: Tests the SSH connections to both devices.
- **Request Body**:
  ```json
  {
    "device1": {
      "host": "device1_host",
      "port": 22,
      "username": "device1_user",
      "password": "device1_password"
    },
    "device2": {
      "host": "device2_host",
      "port": 22,
      "username": "device2_user",
      "password": "device2_password"
    }
  }
  ```
- **Response**:
  ```json
  {
    "status": "completed",
    "timestamp": "2024-07-24T12:00:00.000000",
    "connection_tests": {
      "device1": {"status": "connected", "message": "Connection successful"},
      "device2": {"status": "connected", "message": "Connection successful"}
    }
  }
  ```

### System Security Monitor

- **Endpoint**: `/system_security_monitor`
- **Method**: `GET`
- **Description**: Generates a system security report.
- **Response**:
  ```json
  {
    "status": "success",
    "timestamp": "2024-07-24T12:00:00.000000",
    "report": {
      "users": [...],
      "network_connections": [...],
      "open_ports": [...]
    }
  }
  ```

## Configuration

### Environment Variables

- `DB_CONFIG`: Configuration for the Oracle database.
  ```python
  DB_CONFIG = {
      "dsn": "10.42.0.243:1521/FREE",
      "username": "SYS",
      "password": "oracle"
  }
  ```

### CORS

The API is configured to allow Cross-Origin Resource Sharing (CORS) from the following origins:

- `http://10.42.0.1:4200`
- `http://10.0.0.1:4200`
- `http://localhost:4200`
- `http://10.0.0.243:3000`
- `http://10.42.0.243:3000`
- `http://10.42.0.1:3000`
- `http://localhost:3000`
- `http://10.0.0.1:3000`

## Error Handling

The API provides detailed error messages in JSON format for failed requests:

```json
{
  "status": "error",
  "message": "Error message here",
  "timestamp": "2024-07-24T12:00:00.000000"
}
```

## Dependencies

- `Flask`: Web framework.
- `flask_cors`: For handling Cross-Origin Resource Sharing (CORS).
- `requests`: For making HTTP requests.
- `paramiko`: For SSH connections.
- `datetime`: For handling timestamps.
- `logging`: For logging events.

## Running the API

1.  **Clone the repository:**
    ```bash
    git clone [repository_url]
    cd [repository_directory]
    ```

2.  **Install the dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Flask application:**
    ```bash
    python app.py
    ```

    The API will be accessible at `http://0.0.0.0:5000`.

## Security Considerations

-   Ensure that SSH keys are securely managed and rotated regularly.
-   Avoid hardcoding sensitive information such as passwords. Use environment variables or secure configuration management.
-   Implement proper access control and authentication mechanisms.
-   Monitor logs for suspicious activity.

## Contributing

Please submit pull requests with detailed explanations of the changes.