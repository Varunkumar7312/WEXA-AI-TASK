StockFlow MVP – Product Requirements 

Version: v0.1
Author: Varun Kumar E
Date: Jan 6, 2026

1. Overview
StockFlow MVP is a simple SaaS-based inventory management system built to demonstrate end-to-end functionality within 6 hours. It helps small sellers manage products and track stock levels without using spreadsheets.

2. Objective
- User signup and login
- Manage products (add, edit, delete)
- View inventory summary and low-stock alerts
- Update low-stock threshold settings
- Fully working demo without manual database changes

3. Target User
Single Owner/Admin user who manages inventory daily using a laptop or desktop.

4. Core Features
Authentication:
- Email & password signup/login
- Organization created on signup
- Secure JWT-based sessions

Products:
- Product fields: Name, SKU, Quantity, Prices, Threshold
- Full CRUD operations
- SKU unique per organization

Dashboard:
- Total products count
- Total stock quantity
- Low-stock items list

Settings:
- Default low-stock threshold (default: 5)
- Applies to products without custom threshold

5. Technology Stack
Backend: Node.js, Express, Sequelize  
Database: SQLite (single file)  
Frontend: HTML, CSS, JavaScript  
Security: bcrypt, JWT, CORS  


6. Security & Multi-Tenancy
- Password hashing using bcrypt
- JWT authentication (24h expiry)
- All data scoped by organization ID
- No cross-organization data access

7. Success Criteria
A user can:
- Sign up and log in
- Add, edit, delete products
- See dashboard updates instantly
- View low-stock alerts
- Update settings
- Complete full demo end-to-end

8. Deployment
- npm install
- npm run dev
- Runs on localhost with auto-created SQLite DB

9.Application Directory Structure

StockFlow/
├── node_modules/          (created by npm)
├── public/
│   └── index.html         ← Frontend (all UI)
├── database.sqlite        (created when server runs)
├── package.json            (dependencies+project config)

├── package-lock.json  (dependencies version)        
├── .env                            (secrets/config)
└── server.js              ← Backend (all API)


10.Status: Completed and Tested
