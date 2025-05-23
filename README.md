# Remote Device Management System

A system for remotely managing Android devices from a Windows application over the internet.

## System Overview

This project consists of three main components:

1. **Server**: A Node.js WebSocket server that facilitates communication between devices and clients
2. **Android App**: Background service that receives and executes commands
3. **Windows Client**: Desktop application for sending commands and viewing responses

## Server Component

The server acts as a relay between Android devices and Windows clients, using WebSocket connections to maintain real-time communication.

### Features
- Device registration and management
- Command relaying
- Real-time data streaming
- Connection management

### Installation

```bash
# Install dependencies
npm install

# Start the server
npm start
