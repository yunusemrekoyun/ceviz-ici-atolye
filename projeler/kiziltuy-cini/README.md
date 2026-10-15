<div align="center">
  <a href="https://www.mongodb.com/"><img src="https://cdn.worldvectorlogo.com/logos/mongodb-icon-1.svg" alt="MongoDB" height="40"/></a>
  <a href="https://expressjs.com/"><img src="https://cdn.worldvectorlogo.com/logos/express-109.svg" alt="Express" height="40"/></a>
  <a href="https://react.dev/"><img src="https://cdn.worldvectorlogo.com/logos/react-2.svg" alt="React" height="40"/></a>
  <a href="https://nodejs.org/"><img src="https://cdn.worldvectorlogo.com/logos/nodejs-icon.svg" alt="Node.js" height="40"/></a>
  <a href="https://vitejs.dev/"><img src="https://vitejs.dev/logo.svg" alt="Vite" height="40"/></a>
</div>

# MERN-Product-Showroom-Project

**MERN = MongoDB + Express + React + Node.js**

---

## Description

A site that includes all the features for businesses or individuals who want to showcase their products in any area or create blogs.

## Features

- Product listing with filtering and categorization
- Like, comment, or add to wishlist
- Blog creation and management
- Admin dashboard: view product/blog visits, likes, and comment statistics
- User authentication and role-based access
- Image upload & compression
- Rich text editing

## Tech Stack

- **Frontend:** React 18, Vite, Ant Design, Swiper, Recharts, Quill, etc.
- **Backend:** Express 4, Node.js, MongoDB (Mongoose)
- **Other:** Stripe, Multer, Morgan, bcryptjs, dotenv, CORS

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (local or cloud)

### 1. Clone the Repository

```sh
git clone https://github.com/yunusemrekoyun/MERN-Product-Showroom-Project.git
cd MERN-Product-Showroom-Project
```

### 2. Backend Setup

```sh
cd backend
npm install
```

- Create a `.env` file in `/backend` with the following content:
  ```
  MONGO_URI=your_mongodb_connection_string
  JWT_SECRET=your_jwt_secret
  STRIPE_SECRET=your_stripe_secret
  ```
- Start the backend server:
  ```sh
  npm run start
  ```

### 3. Frontend Setup

```sh
cd ../frontend
npm install
```

- Create a `.env` file in `/frontend` with the following content:
  ```
  VITE_API_BASE_URL=http://localhost:5000
  ```
  (Change the URL if your backend runs on a different address.)

- Start the frontend server:
  ```sh
  npm run dev
  ```

## Usage

- Visit [http://localhost:5173](http://localhost:5173) (default Vite port) in your browser.
- Register/login, explore products/blogs, interact, and use the admin dashboard.

## Dependencies

### Backend

- express ^4.18.2
- mongoose ^7.5.2
- dotenv ^16.3.1
- bcryptjs ^2.4.3
- cors ^2.8.5
- morgan ^1.10.0
- multer ^2.0.0
- stripe ^13.8.0
- nodemon ^3.0.1 (dev)

### Frontend

- react ^18.2.0
- react-dom ^18.2.0
- antd ^5.9.3
- @ant-design/compatible ^5.1.4
- @stripe/stripe-js ^2.1.6
- aos ^2.3.4
- browser-image-compression ^2.0.2
- quill ^2.0.3
- react-quill ^2.0.0
- react-router-dom ^6.16.0
- react-icons ^5.5.0
- react-slick ^0.29.0
- react-swipeable ^7.0.2
- recharts ^2.15.0
- slick-carousel ^1.8.1
- swiper ^11.2.7
- vite ^4.4.5 (dev)
- eslint, @types/react, etc. (dev)

## License

This project is open-source and free to use.

## Author

Developed by [yunusemrekoyun](https://github.com/yunusemrekoyun)

---

> _Built with MongoDB, Express, React, Node.js, and Vite. Logos belong to their respective owners._
