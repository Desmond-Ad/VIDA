// server.js
require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const os = require('os');
const path = require("path");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// CORS configuration: allow Live Server dev origins + production origins
// We'll also add all local IPv4 addresses dynamically so devices on the LAN
// can access the API during development.
function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

const localIPs = getLocalIPv4Addresses();
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5501',
  'http://127.0.0.1:5501',
  'http://localhost:3000',  // common dev port
  'http://127.0.0.1:3000'
];

// add LAN IPs to allowlist (e.g. http://192.168.x.x:5000)
localIPs.forEach(ip => {
  allowedOrigins.push(`http://${ip}:5000`);
});

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like direct navigation or curl)
    if (!origin) return callback(null, true);
    // allow if origin is in allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // in dev, log and allow local/LAN ips
    if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.match(/\d+\.\d+\.\d+\.\d+/))) {
      console.log(`✅ CORS approved (dev): ${origin}`);
      return callback(null, true);
    }
    // deny otherwise
    console.log(`❌ CORS denied: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Simple request logger to help debug mobile connectivity
app.use((req, res, next) => {
  const remote = req.ip || req.connection.remoteAddress || '';
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from ${remote}`);
  next();
});

app.use(express.json());

// Also serve the Public folder under the /Public path (alias)
app.use('/Public', express.static(path.join(__dirname, 'Public')));

// PWA-specific middleware: set cache headers for manifest and service worker
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // cache for 1 hour
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'); // always revalidate
  res.sendFile(path.join(__dirname, 'sw.js'));
});

// Serve static files
app.use(express.static(path.join(__dirname, "Public")));
app.use('/js', express.static(path.join(__dirname, "js")));
app.use('/cs', express.static(path.join(__dirname, "cs")));
app.use('/images', express.static(path.join(__dirname, "images")));

// Environment variables
let uri = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!uri) {
  console.warn("⚠️ Warning: MONGODB_URI environment variable not set. Falling back to local MongoDB at mongodb://localhost:27017/vida");
  // fallback for local development
  uri = 'mongodb://localhost:27017/vida';
}

if (!JWT_SECRET) {
  console.warn("⚠️ Warning: JWT_SECRET environment variable not set. Using development fallback secret — change this in production.");
  // fallback secret for local development only
  process.env.JWT_SECRET = 'dev_jwt_secret_change_me';
}

// MongoDB Connection
mongoose.connect(uri)
  .then(() => {
    console.log("✅ MongoDB connected successfully!");
    // Default users removed — use /Public/setup.html to create accounts
  })
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ===== SCHEMAS =====

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Allowed roles: admin, staff, purchase, rev
  role: { type: String, enum: ['admin', 'staff', 'purchase', 'rev'], default: 'staff' },
  createdAt: { type: Date, default: Date.now }
});

// Order Schema
const orderSchema = new mongoose.Schema({
  name: String,
  phone: String,
  quantity: Number,
  amountPaid: Number,
  amountOwed: Number,
  dateTime: String,
  recordDate: String,
  done: Boolean,
  deliveryTime: String,
  paymentMethod: String,
  date: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Order = mongoose.model("Order", orderSchema);

// ===== MIDDLEWARE =====

// Verify JWT Token
function verifyToken(req, res, next) {
  const token = req.headers['authorization'];
  
  if (!token) {
    return res.status(403).json({ error: "No token provided" });
  }
  
  jwt.verify(token.replace('Bearer ', ''), JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  });
}

// Require a specific role (e.g., 'admin')
function requireRole(role) {
  return (req, res, next) => {
    if (!req.userRole) return res.status(403).json({ error: 'Forbidden' });
    if (req.userRole !== role) {
      return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
    }
    next();
  };
}

// ===== PUBLIC AUTH ROUTES (No token required) =====

// Guarded temporary debug endpoint. Only responds when requested from localhost and with ?_debug=1
app.all('/debug-login', (req, res) => {
  const remote = req.ip || req.connection.remoteAddress || '';
  // allow only localhost requests
  if (!(remote.includes('127.0.0.1') || remote.includes('::1') || req.hostname === 'localhost')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.query._debug !== '1') {
    return res.status(400).json({ error: 'Missing _debug=1' });
  }

  console.log('🛠️  DEBUG /debug-login - Method:', req.method);
  console.log('🛠️  DEBUG /debug-login - Headers:', req.headers);
  let bodyPreview = req.body;
  try {
    if (typeof bodyPreview === 'object') bodyPreview = JSON.stringify(bodyPreview);
  } catch (e) {
    bodyPreview = String(bodyPreview);
  }
  console.log('🛠️  DEBUG /debug-login - Body:', bodyPreview);
  res.setHeader('Content-Type', 'application/json');
  res.json({ message: 'debug', method: req.method, headers: req.headers, body: req.body });
});

// Dev-only: list users (no passwords) - only accessible from localhost
app.get('/debug-users', async (req, res) => {
  const remote = req.ip || req.connection.remoteAddress || '';
  if (!(remote.includes('127.0.0.1') || remote.includes('::1') || req.hostname === 'localhost')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const users = await User.find({}, { username: 1, role: 1, _id: 0 }).lean();
    res.json({ users });
  } catch (err) {
    console.error('Error fetching users for debug:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Dev-only: reset a user's password (only from localhost)
app.post('/debug-set-password', async (req, res) => {
  const remote = req.ip || req.connection.remoteAddress || '';
  if (!(remote.includes('127.0.0.1') || remote.includes('::1') || req.hostname === 'localhost')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    console.log(`🔧 Password reset for user: ${username}`);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Setup endpoint: create admin/staff accounts with a setup code (one-time per role ideally)
app.post("/setup-admin", async (req, res) => {
  try {
    const { username, password, role, setupCode } = req.body;

    if (!username || !password || !role || !setupCode) {
      return res.status(400).json({ error: "All fields required" });
    }

    // Check setup code
    const validCode = process.env.SETUP_CODE || 'setup123';
    if (setupCode !== validCode) {
      return res.status(403).json({ error: "Invalid setup code" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      role: role || 'staff'
    });

    await user.save();

    console.log(`✅ Account created via setup: ${username} (role: ${role})`);
    res.status(201).json({ message: `Account created successfully!`, username: user.username, role: user.role });
  } catch (err) {
    console.error("Setup error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Register new user - staff only (admin accounts created via /setup-admin or by admin)
app.post("/register", async (req, res) => {
  try {
    console.log('[REGISTER] Headers:', req.headers);
    console.log('[REGISTER] Body:', req.body);
    const { username, password, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Prevent staff from registering as admin via this endpoint
    if (role === 'admin') {
      return res.status(403).json({ error: "Registration for admin Dashboard is not allowed via this form. Please contact an administrator." });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      username,
      password: hashedPassword,
      role: 'staff'  // force staff role
    });
    
    await user.save();
    
    console.log("✅ User registered:", username);
    res.status(201).json({ message: "User registered successfully!", username: user.username, role: user.role });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Global error handler to ensure stack traces are logged for uncaught errors
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err && err.stack ? err.stack : err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: err && err.message ? err.message : 'Internal Server Error' });
});

// Login
app.post("/login", async (req, res) => {
  console.log("🔐 POST /login - Login attempt");
  console.log("🔐 POST /login - Username:", req.body.username);
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log("❌ POST /login - Missing credentials");
      return res.status(400).json({ error: "Username and password required" });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      console.log("❌ POST /login - User not found:", username);
      return res.status(400).json({ error: "Invalid username or password" });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ POST /login - Invalid password for:", username);
      return res.status(400).json({ error: "Invalid username or password" });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log("✅ User logged in successfully:", username, "(Role:", user.role + ")");
    res.json({ 
      message: "Login successful",
      token,
      user: { username: user.username, role: user.role }
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Validate token (used by clients to verify stored token and role)
app.get('/validate-token', verifyToken, (req, res) => {
  try {
    res.json({ userId: req.userId, role: req.userRole });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ORDER ROUTES (Protected with JWT) =====

app.post("/orders", verifyToken, async (req, res) => {
  console.log("📝 POST /orders - Request received");
  console.log("📝 POST /orders - User ID:", req.userId, "Role:", req.userRole);
  console.log("📝 POST /orders - Body:", JSON.stringify(req.body, null, 2));
  try {
    console.log("🔄 Creating new order in database...");
    const newOrder = new Order(req.body);
    await newOrder.save();
    console.log("✅ Order saved successfully! ID:", newOrder._id);
    console.log("✅ Order details:", {
      name: newOrder.name,
      phone: newOrder.phone,
      quantity: newOrder.quantity,
      amountPaid: newOrder.amountPaid,
      done: newOrder.done
    });
    res.status(201).json({ message: "Order saved successfully!", order: newOrder });
  } catch (err) {
    console.error("❌ Error saving order:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders", verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

app.get("/orders/today", verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const orders = await Order.find({ recordDate: today });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/orders/:id", verifyToken, async (req, res) => {
  console.log("🔄 PATCH /orders/:id - Request received");
  console.log("🔄 PATCH /orders/:id - Order ID:", req.params.id);
  console.log("🔄 PATCH /orders/:id - User ID:", req.userId, "Role:", req.userRole);
  console.log("🔄 PATCH /orders/:id - Update data:", JSON.stringify(req.body, null, 2));
  try {
    const { id } = req.params;
    const { done } = req.body;
    
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { done: done },
      { new: true }
    );
    
    if (!updatedOrder) {
      console.log("❌ PATCH /orders/:id - Order not found:", id);
      return res.status(404).json({ error: "Order not found" });
    }
    console.log("✅ Order updated successfully!");
    console.log("✅ Updated order details:", {
      id: updatedOrder._id,
      name: updatedOrder.name,
      done: updatedOrder.done,
      updatedAt: new Date().toISOString()
    });
    res.json({ message: "Order updated successfully!", order: updatedOrder });
  } catch (err) {
    console.error("❌ Error updating order:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/orders/:id", verifyToken, async (req, res) => {
  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }
    console.log("✅ Order updated successfully:", updatedOrder);
    res.json({ message: "Order updated!", order: updatedOrder });
  } catch (err) {
    console.error("Error updating order:", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete("/orders/:id", verifyToken, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders/customer/:phone", verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const orders = await Order.find({ phone: req.params.phone });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== PUBLIC ROUTE =====

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

// ===== START SERVER (bind to all interfaces) =====

const HOST = '0.0.0.0';

function getLocalIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  const localIPs = getLocalIPv4Addresses();
  if (localIPs.length) {
    localIPs.forEach(ip => console.log(`🔗 Accessible on: http://${ip}:${PORT}`));
  } else {
    console.log('⚠️ No non-internal IPv4 addresses detected. You can still access via localhost.');
  }
  console.log(`📝 To create admin user, POST to http://localhost:${PORT}/register`);
  console.log(`📝 To login, POST to http://localhost:${PORT}/login`);
});
// end of file