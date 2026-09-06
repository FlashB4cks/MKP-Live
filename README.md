# MKP Live - Full-Stack Real-Time Web Application

**MKP Live** es una aplicación web de comunicación en tiempo real inspirada en la arquitectura de Discord, con canales por servidor, gestión de miembros con roles, presencia online/offline y autenticación JWT.

---

## 🛠️ Stack Tecnológico

* **Backend**: Django 5 + Django REST Framework + Django Channels + Daphne (ASGI)
* **Frontend**: React 18 + Vite + Tailwind CSS + Zustand + Lucide Icons
* **Tiempo Real**: WebSockets nativos con capa de canales (Redis / In-Memory fallback)
* **Base de Datos**: PostgreSQL (producción / web) con fallback a SQLite (desarrollo local ágil)
* **Autenticación**: JWT (`djangorestframework-simplejwt`) tanto para REST como para WebSockets Handshake

---

## 📁 Estructura del Proyecto

```text
PrimerProyecto-Telecomunicaciones/
├── .env.example                # Plantilla de variables de entorno
├── .gitignore                  # Exclusión de venv, cache, builds y db
├── Dockerfile                  # Contenedor listo para despliegue web
├── render.yaml                 # Blueprint para desplegar en Render con 1 clic
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── core/                   # Configuración central Django (settings, asgi, urls)
│   └── apps/
│       ├── accounts/           # Modelo User personalizado, auth JWT, perfiles
│       ├── servers/            # Servidores, miembros, roles, invitaciones
│       ├── channels_app/       # Canales de texto (#general, etc.)
│       └── chat/               # Mensajes, consumers WS, middleware JWT para WS
└── frontend/
    ├── package.json
    ├── vite.config.js          # Proxy a backend para API y WebSockets
    ├── tailwind.config.js      # Paleta de colores oficial de Discord
    └── src/
        ├── api/                # Cliente Axios con interceptores JWT
        ├── components/         # Barras laterales, chat, modales
        ├── hooks/              # useChatWebSocket con auto-reconexión
        ├── pages/              # Login, Registro, Dashboard principal
        └── store/              # Estado global con Zustand (auth, servers, chat)
```

---

## 🚀 Ejecución en Desarrollo Local

### 1. Backend (Django + Channels)
Abre una terminal en la raíz del proyecto:

```bash
# 1. El entorno virtual ya se encuentra creado en .venv
# En Windows (PowerShell):
.\.venv\Scripts\activate

# 2. Las dependencias ya están instaladas. Si necesitas reinstalarlas:
pip install -r backend/requirements.txt

# 3. Aplicar migraciones:
python backend/manage.py migrate

# 4. Iniciar el servidor ASGI (Daphne):
python backend/manage.py runserver
```
El servidor backend quedará escuchando en `http://127.0.0.1:8000/`.

### 2. Frontend (React + Vite)
Abre una segunda terminal:

```bash
cd frontend

# Iniciar servidor de desarrollo Vite:
npm run dev
```
La aplicación web estará disponible en `http://localhost:5173/`.
Cualquier petición a `/api` o `/ws` se reenviará automáticamente al backend Django.

---

## 🌐 Despliegue en la Web (Cloud Ready)

El proyecto está diseñado bajo los principios **Twelve-Factor App**, lo que significa que no necesitas modificar código para montarlo en internet:

### Opción A: Despliegue en Render (Recomendada)
1. Sube este repositorio a **GitHub**.
2. Entra en [Render.com](https://render.com) y selecciona **Blueprints**.
3. Conecta el repositorio: Render detectará el archivo [render.yaml](render.yaml) y creará automáticamente:
   - **Base de datos PostgreSQL**
   - **Servicio Redis** (para la capa de canales de WebSockets)
   - **Web Service Django (ASGI)** corriendo Daphne
4. Para el frontend: crea un **Static Site** en Render apuntando a la carpeta `frontend/`, con build command `npm run build` y publish directory `dist/`.

### Opción B: Despliegue en Railway
1. En [Railway.app](https://railway.app), crea un nuevo proyecto desde el repositorio de GitHub.
2. Añade un plugin de **PostgreSQL** y un plugin de **Redis**.
3. Railway inyectará automáticamente `DATABASE_URL` y `REDIS_URL`.
4. El backend detectará automáticamente ambas variables de entorno en `core/settings.py` y levantará Daphne mediante el [Procfile](backend/Procfile).

---

## 🧪 Pruebas Automatizadas

Para verificar los modelos, permisos, invitaciones y endpoints:

```bash
.\.venv\Scripts\python.exe backend/manage.py test servers
```
Resultado: Todas las pruebas (autenticación, creación de servidores y canal general, generación y uso de invitaciones, historial de mensajes) pasan con éxito.
