# React Components for Secure Copy Application

This document provides a detailed overview of the React components used in the Secure Copy application. Each component is responsible for a specific functionality, such as system monitoring, file exploration, file transfer, command execution, and connection testing.

## Table of Contents

1.  [App (page.tsx)(#app-pagetsx)
2.  [CommandExecutor (command-executor.tsx)](#commandexecutor-command-executortsx)
3.  [ConnectionTest (connection-test.tsx)](#connectiontest-connection-testtsx)
4.  [FileExplorer (file-explorer.tsx)](#fileexplorer-file-explorertsx)
5.  [FileTransfer (file-transfer.tsx)](#filetransfer-file-transfertsx)

## 1. App (page.tsx)

### Description

The `App` component serves as the main entry point for the application. It manages the overall state, handles data fetching for system monitoring, and renders the appropriate content based on the active tab.

### Features

-   **State Management**: Manages the active tab, monitoring data, loading state, error state, last update time, and auto-refresh settings.
-   **Data Fetching**: Fetches system security monitoring data from the backend API.
-   **Automatic Refresh**: Automatically refreshes monitoring data at a set interval.
-   **Error Handling**: Displays error messages and provides a retry button when data fetching fails.
-   **Dynamic Content Rendering**: Renders different components based on the selected tab.
-   **Data Formatting**: Formats bytes and timestamps for display.
-   **Status Coloring**: Dynamically changes the color of status indicators based on predefined thresholds.

### State Variables

-   `activeTab`: `string` - Currently selected tab (e.g., "monitor", "files", "transfer").
-   `data`: `MonitoringData | null` - System monitoring data fetched from the API.
-   `loading`: `boolean` - Indicates whether data is currently being loaded.
-   `error`: `string | null` - Stores any error messages encountered during data fetching.
-   `lastUpdate`: `Date | null` - The last time the data was successfully updated.
-   `autoRefresh`: `boolean` - Indicates whether auto-refresh is enabled.

### Functions

-   `fetchData`: Fetches system monitoring data from the API and updates the state.
-   `formatBytes`: Formats byte values into human-readable sizes (e.g., KB, MB, GB).
-   `formatTimestamp`: Formats timestamp strings into a local date and time format.
-   `getStatusColor`: Determines the color of a status indicator based on predefined thresholds.
-   `renderContent`: Renders the appropriate content based on the active tab.
-   `renderMonitorContent`: Renders the system monitoring dashboard content.

### Component Structure

```jsx
function App() {
  // ... state variables and functions ...

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">{renderContent()}</main>
    </div>
  );
}
```

## 2. CommandExecutor (command-executor.tsx)

### Description

The `CommandExecutor` component provides an interface for executing commands on a remote device. It includes fields for device configuration, command input, and displays the command result and history.

### Features

-   **Device Configuration**: Allows users to configure the target device's connection details.
-   **Command Input**: Provides a text area for entering commands.
-   **Command Execution**: Executes commands on the configured device and displays the result.
-   **Command History**: Maintains a history of executed commands for easy re-execution.
-   **Common Commands**: Provides a set of common commands for quick access.
-   **Error Handling**: Displays error messages when command execution fails.

### State Variables

-   `device1`: `Device` - Configuration settings for the target device.
-   `command`: `string` - The command to be executed.
-   `selectedDevice`: `"device1"` - Specifies the device to execute the command on.
-   `commandResult`: `CommandResponse | null` - The result of the executed command.
-   `loading`: `boolean` - Indicates whether a command is currently being executed.
-   `error`: `string | null` - Stores any error messages encountered during command execution.
-   `commandHistory`: `CommandResponse[]` - An array of previously executed commands.

### Functions

-   `handleDeviceChange`: Updates the device configuration settings.
-   `executeCommand`: Executes the entered command on the configured device.
-   `handleKeyPress`: Handles key press events, allowing the user to execute commands with Ctrl+Enter.
-   `insertCommand`: Inserts a predefined command into the command input field.

### Component Structure

```jsx
function CommandExecutor() {
  // ... state variables and functions ...

  return (
    <div className="command-executor">
      {/* ... component structure ... */}
    </div>
  );
}
```

## 3. ConnectionTest (connection-test.tsx)

### Description

The `ConnectionTest` component enables users to test SSH connections to two configured devices. It provides input fields for device credentials and displays the connection status for each device.

### Features

-   **Device Configuration**: Allows users to configure connection details for two devices.
-   **Connection Testing**: Tests the SSH connection to both devices and displays the results.
-   **Status Indicators**: Provides visual indicators for connection status (connected, failed, timeout).
-   **Error Handling**: Displays error messages when connection testing fails.
-   **Test History**: Maintains a history of connection tests for review.

### State Variables

-   `device1`: `Device` - Configuration settings for the first device.
-   `device2`: `Device` - Configuration settings for the second device.
-   `connectionResult`: `ConnectionResponse | null` - The result of the connection test.
-   `loading`: `boolean` - Indicates whether the connection test is in progress.
-   `error`: `string | null` - Stores any error messages encountered during connection testing.
-   `testHistory`: `ConnectionResponse[]` - An array of previous connection test results.

### Functions

-   `handleDeviceChange`: Updates the device configuration settings.
-   `testConnections`: Tests the SSH connections to both configured devices.
-   `getStatusIcon`: Returns a status icon based on the connection status.
-   `getStatusColor`: Returns a color based on the connection status.

### Component Structure

```jsx
function ConnectionTest() {
  // ... state variables and functions ...

  return (
    <div className="connection-test">
      {/* ... component structure ... */}
    </div>
  );
}
```

## 4. FileExplorer (file-explorer.tsx)

### Description

The `FileExplorer` component allows users to browse and select files from two connected devices. It provides a file tree interface for each device, allowing users to navigate directories and select files.

### Features

-   **Device Configuration**: Allows users to configure connection details for two devices.
-   **File Listing**: Lists files and directories on both configured devices.
-   **File Selection**: Allows users to select files and directories for further actions.
-   **File Icons**: Displays icons for different file types.
-   **File Information**: Shows file names, paths, and types.
-   **Error Handling**: Displays error messages when file listing fails.

### State Variables

-   `device1`: `Device` - Configuration settings for the first device.
-   `device2`: `Device` - Configuration settings for the second device.
-   `fileList`: `FileListResponse | null` - The list of files and directories on both devices.
-   `loading`: `boolean` - Indicates whether file listing is in progress.
-   `error`: `string | null` - Stores any error messages encountered during file listing.
-   `selectedFiles`: `{ device1: string[]; device2: string[] }` - An object containing arrays of selected files for each device.

### Functions

-   `handleDeviceChange`: Updates the device configuration settings.
-   `listFiles`: Retrieves the list of files and directories from the configured devices.
-   `toggleFileSelection`: Toggles the selection state of a file or directory.
-   `getFileIcon`: Returns an icon based on the file type.
-   `formatFileSize`: Returns a formatted file size (placeholder).

### Component Structure

```jsx
function FileExplorer() {
  // ... state variables and functions ...

  return (
    <div className="file-explorer">
      {/* ... component structure ... */}
    </div>
  );
}
```

## 5. FileTransfer (file-transfer.tsx)

### Description

The `FileTransfer` component enables users to securely transfer files between two connected devices. It provides input fields for device credentials, source and destination paths, and transfer direction.

### Features

-   **Device Configuration**: Allows users to configure connection details for two devices.
-   **File Transfer**: Transfers files between the configured devices.
-   **Transfer Direction**: Allows users to select the transfer direction (Device 1 to Device 2 or vice versa).
-   **File Size Formatting**: Formats file sizes for display.
-   **Error Handling**: Displays error messages when file transfer fails.
-   **Transfer History**: Maintains a history of file transfers for review.

### State Variables

-   `device1`: `Device` - Configuration settings for the first device.
-   `device2`: `Device` - Configuration settings for the second device.
-   `sourcePath`: `string` - The path to the source file.
-   `destPath`: `string` - The path to the destination file.
-   `direction`: `"device1_to_device2" | "device2_to_device1"` - The direction of the file transfer.
-   `transferResult`: `TransferResponse | null` - The result of the file transfer.
-   `loading`: `boolean` - Indicates whether a file transfer is in progress.
-   `error`: `string | null` - Stores any error messages encountered during file transfer.
-   `transferHistory`: `TransferResponse[]` - An array of previous file transfer results.

### Functions

-   `handleDeviceChange`: Updates the device configuration settings.
-   `transferFile`: Transfers the specified file between the configured devices.
-   `formatFileSize`: Formats byte values into human-readable sizes (e.g., KB, MB, GB).
-   `swapDirection`: Swaps the transfer direction and updates the source and destination paths.

### Component Structure

```jsx
function FileTransfer() {
  // ... state variables and functions ...

  return (
    <div className="file-transfer">
      {/* ... component structure ... */}
    </div>
  );
}