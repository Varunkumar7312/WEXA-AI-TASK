require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database Setup
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'database.sqlite',
  logging: false
});

// Models
const Organization = sequelize.define('Organization', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  defaultLowStockThreshold: { type: DataTypes.INTEGER, defaultValue: 5 }
}, { timestamps: true });

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  organizationId: { type: DataTypes.UUID, allowNull: false }
}, { timestamps: true });

const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  organizationId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  sku: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  quantityOnHand: { type: DataTypes.INTEGER, defaultValue: 0 },
  costPrice: DataTypes.DECIMAL(10, 2),
  sellingPrice: DataTypes.DECIMAL(10, 2),
  lowStockThreshold: DataTypes.INTEGER
}, { timestamps: true });

// Relationships
Organization.hasMany(User, { foreignKey: 'organizationId' });
User.belongsTo(Organization, { foreignKey: 'organizationId' });
Organization.hasMany(Product, { foreignKey: 'organizationId' });
Product.belongsTo(Organization, { foreignKey: 'organizationId' });

// Auth Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    console.log('✅ Token verified - orgId:', req.user.orgId);
    next();
  });
};

// SIGNUP
app.post('/api/signup', async (req, res) => {
  console.log('📝 Signup request:', req.body);
  
  try {
    const { email, password, organizationName } = req.body;
    
    if (!email || !password || !organizationName) {
      return res.status(400).json({ error: 'Missing email, password, or organizationName' });
    }
    
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User exists' });

    const org = await Organization.create({ name: organizationName });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      organizationId: org.id
    });

    console.log('✅ Signup success - userId:', user.id, 'orgId:', org.id);
    res.json({ 
      message: 'Signup successful', 
      userId: user.id, 
      orgId: org.id,
      organizationId: org.id
    });
  } catch (err) {
    console.error('❌ Signup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  console.log('🔐 Login request:', req.body);
  
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: user.id, orgId: user.organizationId }, 
      process.env.JWT_SECRET || 'fallback-secret-key', 
      { expiresIn: '24h' }
    );
    
    console.log('✅ Login success - orgId:', user.organizationId);
    res.json({ 
      token, 
      userId: user.id, 
      orgId: user.organizationId 
    });
  } catch (err) {
    console.error('❌ Login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET PRODUCTS
app.get('/api/products', verifyToken, async (req, res) => {
  try {
    console.log('📦 Getting products for orgId:', req.user.orgId);
    const products = await Product.findAll({ 
      where: { organizationId: req.user.orgId } 
    });
    res.json(products);
  } catch (err) {
    console.error('❌ Get products error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// CREATE PRODUCT
app.post('/api/products', verifyToken, async (req, res) => {
  console.log('➕ Add product request:', req.body);
  console.log('   Organization ID from token:', req.user.orgId);
  
  try {
    const { name, sku, quantityOnHand, costPrice, sellingPrice, lowStockThreshold, description } = req.body;
    
    if (!req.user.orgId) {
      return res.status(400).json({ error: 'Missing organization ID in token' });
    }

    const product = await Product.create({
      organizationId: req.user.orgId,
      name,
      sku,
      quantityOnHand: quantityOnHand || 0,
      costPrice: costPrice || null,
      sellingPrice: sellingPrice || null,
      lowStockThreshold: lowStockThreshold || null,
      description
    });
    
    console.log('✅ Product created:', product.id);
    res.json(product);
  } catch (err) {
    console.error('❌ Add product error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE PRODUCT
app.put('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findOne({ 
      where: { id: req.params.id, organizationId: req.user.orgId } 
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await product.update(req.body);
    res.json(product);
  } catch (err) {
    console.error('❌ Update product error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE PRODUCT
app.delete('/api/products/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findOne({ 
      where: { id: req.params.id, organizationId: req.user.orgId } 
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await product.destroy();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('❌ Delete product error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET DASHBOARD
app.get('/api/dashboard', verifyToken, async (req, res) => {
  try {
    const org = await Organization.findByPk(req.user.orgId);
    const products = await Product.findAll({ 
      where: { organizationId: req.user.orgId } 
    });
    const totalProducts = products.length;
    const totalQuantity = products.reduce((sum, p) => sum + p.quantityOnHand, 0);
    const threshold = org.defaultLowStockThreshold;
    const lowStockItems = products.filter(p => p.quantityOnHand <= (p.lowStockThreshold || threshold));

    res.json({ 
      totalProducts, 
      totalQuantity, 
      lowStockItems, 
      defaultLowStockThreshold: threshold 
    });
  } catch (err) {
    console.error('❌ Dashboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE SETTINGS
app.put('/api/settings', verifyToken, async (req, res) => {
  try {
    const org = await Organization.findByPk(req.user.orgId);
    await org.update({ defaultLowStockThreshold: req.body.defaultLowStockThreshold });
    res.json(org);
  } catch (err) {
    console.error('❌ Settings update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
sequelize.sync({ force: false }).then(() => {
  const port = process.env.PORT || 10000;
  app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
  });
}).catch(err => console.error('❌ DB Error:', err));