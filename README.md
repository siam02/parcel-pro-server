# ParcelPro - Backend

ParcelPro is a comprehensive parcel delivery management application. The backend is built with Node.js and Express, providing robust APIs for user management, parcel tracking, and delivery operations.

## Features

- User authentication and JWT-based authorization
- Role-based access control (Admin, User, DeliveryMen)
- Parcel booking, tracking, and management
- Payment integration with Stripe
- Review and rating system for delivery men
- Statistical data endpoints for admin

## Installation

1. Clone the repository:

```bash
git clone https://github.com/siam02/parcel-pro-server.git
```

2. Install dependencies:

```bash
cd southeast-explorer-backend
npm install
```

3. Create a .env file in the root directory and add your MongoDB credentials:

 ```env
DB_USER=your-mongodb-user
DB_PASS=your-mongodb-pass
```

4. Start the development server:

```bash
nodemon index.js
```
