# Medifusion - Medical AI Application

A medical AI application built with FastAPI backend and React frontend.

## Project Structure

```
Medifusion/
├── backend/          # FastAPI application
├── frontend/         # React application
├── docker-compose.yml
├── .env
└── README.md
```

## Services

- **PostgreSQL**: Database (Port 5432)
- **RabbitMQ**: Message queue (Port 5672, Management UI: 15672)
- **Redis**: Cache and session store (Port 6379)
- **Backend**: FastAPI application (Port 8000)
- **Frontend**: React application (Port 3000)

## Getting Started

### Prerequisites

- Docker and Docker Compose installed

### Running the Application

1. Make sure your `.env` file is configured (already created)

2. Start all services:
   ```bash
   docker-compose up -d
   ```

3. Access the services:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - RabbitMQ Management: http://localhost:15672 (admin/admin)
   - PostgreSQL: localhost:5432 (admin/admin)

### Stopping the Application

```bash
docker-compose down
```

To remove volumes (data):
```bash
docker-compose down -v
```

## Development

### Backend Development

The backend is set up with hot-reload. Changes to Python files will automatically restart the server.

### Frontend Development

The frontend is set up with hot-reload. Changes to React files will automatically refresh in the browser.

## Network

All services communicate on the `app-network` Docker network, allowing them to reference each other by service name.

