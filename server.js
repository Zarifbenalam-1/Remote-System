const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your domains
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Store connected devices and clients
const devices = new Map(); // Android devices
const clients = new Map(); // Windows clients

// Generate a unique ID for device registration
function generateDeviceId() {
  return crypto.randomBytes(8).toString('hex');
}

// Server status endpoint
app.get('/', (req, res) => {
  res.send('Remote Device Management Server Running');
});

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Device registration
  socket.on('register-device', () => {
    const deviceId = generateDeviceId();
    devices.set(deviceId, socket.id);
    socket.deviceId = deviceId;
    
    console.log(`Device registered with ID: ${deviceId}`);
    socket.emit('registration-complete', { deviceId });
    
    // Notify all clients about new device
    for (const [clientId, clientSocketId] of clients.entries()) {
      io.to(clientSocketId).emit('device-connected', { 
        deviceId, 
        timestamp: new Date().toISOString() 
      });
    }
  });

  // Client registration
  socket.on('register-client', () => {
    const clientId = generateDeviceId();
    clients.set(clientId, socket.id);
    socket.clientId = clientId;
    
    console.log(`Client registered with ID: ${clientId}`);
    
    // Send all connected devices to the client
    const connectedDevices = [];
    for (const [deviceId] of devices.entries()) {
      connectedDevices.push(deviceId);
    }
    
    socket.emit('registration-complete', { 
      clientId,
      connectedDevices 
    });
  });

  // Command relay from client to device
  socket.on('command', (data) => {
    const { deviceId, command, params } = data;
    
    // Find the device socket
    const deviceSocketId = devices.get(deviceId);
    if (deviceSocketId) {
      console.log(`Relaying command to device ${deviceId}: ${command}`);
      io.to(deviceSocketId).emit('execute-command', {
        command,
        params,
        clientId: socket.clientId
      });
    } else {
      socket.emit('error', { message: 'Device not connected' });
    }
  });

  // Response relay from device to client
  socket.on('command-response', (data) => {
    const { clientId, response, command } = data;
    
    // Find the client socket
    const clientSocketId = clients.get(clientId);
    if (clientSocketId) {
      console.log(`Relaying response to client ${clientId}`);
      io.to(clientSocketId).emit('command-result', {
        deviceId: socket.deviceId,
        command,
        response
      });
    }
  });

  // Binary data stream (for camera, files, etc.)
  socket.on('binary-stream', (data) => {
    const { clientId, streamType, chunk } = data;
    
    // Find the client socket
    const clientSocketId = clients.get(clientId);
    if (clientSocketId) {
      io.to(clientSocketId).emit('stream-data', {
        deviceId: socket.deviceId,
        streamType,
        chunk
      });
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    
    // If it was a device
    if (socket.deviceId) {
      devices.delete(socket.deviceId);
      
      // Notify all clients about device disconnect
      for (const [clientId, clientSocketId] of clients.entries()) {
        io.to(clientSocketId).emit('device-disconnected', { 
          deviceId: socket.deviceId 
        });
      }
    }
    
    // If it was a client
    if (socket.clientId) {
      clients.delete(socket.clientId);
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
