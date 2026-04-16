# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Alex Distribuidora** — a Brazilian order management web app. Staff log in, view incoming orders, update delivery status, and trigger WhatsApp notifications to customers when an order goes out for delivery.

## Running the Project

```bash
npm install
node server.js        # starts on http://localhost:3000
```

**Prerequisites:**
- PostgreSQL running locally (see database setup below)
- WhatsApp API server running on `localhost:8080` (required for delivery notifications)

## Database Setup

Connect to PostgreSQL as a superuser and run:

```sql
CREATE USER alex WITH PASSWORD 'alex123';
CREATE DATABASE alex_pedidos OWNER alex;

\c alex_pedidos

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  usuario VARCHAR(255) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL   -- bcrypt hashed
);

CREATE TABLE pedidos (
  id SERIAL PRIMARY KEY,
  telefone VARCHAR(20) NOT NULL,
  nome VARCHAR(255),
  produto VARCHAR(255) NOT NULL,
  endereco VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'novo',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Architecture

Single-file monolith split into two layers:

| Layer | File | Role |
|-------|------|------|
| Backend | `server.js` | Express REST API + PostgreSQL queries |
| Frontend | `public/index.html` | SPA — all UI, state, and JS in one file |

**REST endpoints:**
- `POST /api/login` — returns a JWT (8-hour expiry)
- `GET /api/pedidos` — list all orders (JWT required)
- `POST /api/pedidos` — create order (JWT required)
- `PATCH /api/pedidos/:id` — update status (JWT required)

**Order status flow:** `novo` → `em-entrega` → `entregue`

When status changes to `em-entrega`, the server calls the WhatsApp API (`localhost:8080`) to notify the customer by phone number.

The frontend polls `GET /api/pedidos` every 5 seconds. JWT is stored in `localStorage`; a 401 response triggers auto-logout.

## Hardcoded Configuration

All connection details live directly in `server.js` (no `.env` loading yet, though `.env` is in `.gitignore`):

- DB: `user=alex password=alex123 database=alex_pedidos host=localhost`
- JWT secret: `alex123secret`
- WhatsApp base URL: `http://localhost:8080/message/sendText/alex-pedidos`
- WhatsApp API key: stored in the `Authorization` header constant in `server.js`
- Express port: `3000`

When adding environment-variable support, wire these up through `process.env` and create a `.env.example`.
