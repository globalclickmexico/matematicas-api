# CursoMATE API

API REST independiente para la plataforma CursoMATE. Construida con **Express + TypeScript + MySQL (mysql2)** y autenticación **JWT**.

---

## Requisitos

- Node.js 18+
- MySQL 8.0+
- npm o yarn

---

## Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/cursomate-api.git
cd cursomate-api

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de MySQL y genera un JWT_SECRET seguro
```

### Generar un JWT_SECRET seguro

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Base de datos

```bash
# 1. Crear la base de datos y tablas
mysql -u root -p < sql/schema.sql

# 2. Insertar datos de prueba
mysql -u root -p cursomate < sql/seed.sql
```

### Usuarios de prueba

| Email                   | Password     | Rol       |
|-------------------------|--------------|-----------|
| alumno@cursomate.mx     | cursomate24  | alumno    |
| profesor@cursomate.mx   | profesor24   | profesor  |
| admin@cursomate.mx      | admin2024    | admin     |

> ⚠️ Los hashes del seed son de demostración. En producción genera hashes reales:
> ```bash
> node -e "const b=require('bcryptjs'); b.hash('tu_password',10).then(console.log)"
> ```

---

## Scripts

```bash
npm run dev      # Desarrollo con hot reload (ts-node-dev)
npm run build    # Compilar TypeScript → dist/
npm run start    # Producción (requiere build previo)
```

---

## Variables de entorno

```env
PORT=4000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=cursomate

JWT_SECRET=genera_uno_seguro_con_crypto
JWT_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000
```

---

## Endpoints

Base URL: `http://localhost:4000/api`

### Autenticación

| Método | Ruta           | Auth | Descripción                    |
|--------|----------------|------|--------------------------------|
| POST   | /auth/login    | ❌   | Login, devuelve JWT            |
| GET    | /auth/me       | ✅   | Datos del usuario autenticado  |

**Login — body:**
```json
{
  "email": "alumno@cursomate.mx",
  "password": "cursomate24"
}
```

**Login — respuesta:**
```json
{
  "ok": true,
  "data": {
    "token": "eyJhbGci...",
    "usuario": {
      "id": 1,
      "nombre": "Alumno Demo",
      "email": "alumno@cursomate.mx",
      "rol": "alumno"
    }
  }
}
```

---

### Curso

| Método | Ruta              | Auth | Descripción                                           |
|--------|-------------------|------|-------------------------------------------------------|
| GET    | /ejes             | ✅   | Árbol completo: ejes → secciones → lecciones          |
| GET    | /lecciones/:id    | ✅   | Detalle de una lección con evaluación (sin respuestas)|

**GET /ejes — respuesta:**
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "numero": 1,
      "titulo": "Números y Álgebra",
      "color": "#B71C1C",
      "icono": "ℝ",
      "secciones": [
        {
          "id": 1,
          "numero": "1.1",
          "titulo": "Los Números Reales",
          "lecciones": [
            {
              "id": 1,
              "titulo": "Clasificación de los números reales",
              "completada": false,
              "introCompletada": false,
              "totalPreguntas": 4
            }
          ]
        }
      ]
    }
  ]
}
```

---

### Progreso

| Método | Ruta                     | Auth | Descripción                          |
|--------|--------------------------|------|--------------------------------------|
| GET    | /progreso                | ✅   | Resumen de progreso del alumno       |
| PATCH  | /progreso/:leccionId     | ✅   | Marcar una sección como completada   |

**PATCH /progreso/:leccionId — body:**
```json
{
  "campo": "intro_completada"
}
```

Valores válidos para `campo`:
- `intro_completada`
- `actividad_vista`
- `pdf_visto`

---

### Evaluaciones

| Método | Ruta                                | Auth | Descripción                       |
|--------|-------------------------------------|------|-----------------------------------|
| POST   | /evaluaciones/:leccionId            | ✅   | Enviar respuestas y calificar     |
| GET    | /evaluaciones/:leccionId/intentos   | ✅   | Historial de intentos del alumno  |

**POST /evaluaciones/:leccionId — body:**
```json
{
  "respuestas": [
    { "preguntaId": 1, "opcionId": 3 },
    { "preguntaId": 2, "opcionId": 7 },
    { "preguntaId": 3, "opcionId": 10 }
  ]
}
```

**Respuesta:**
```json
{
  "ok": true,
  "data": {
    "intentoId": 1,
    "calificacion": 66.67,
    "aprobado": false,
    "correctas": 2,
    "total": 3,
    "detalle": [
      { "preguntaId": 1, "opcionId": 3, "esCorrecta": true },
      { "preguntaId": 2, "opcionId": 7, "esCorrecta": false },
      { "preguntaId": 3, "opcionId": 10, "esCorrecta": true }
    ]
  }
}
```

> **Seguridad:** las opciones correctas **nunca** se envían al frontend. La calificación siempre se calcula en el servidor.

---

### Health check

```
GET /api/health
→ { "ok": true, "ts": "2025-01-01T00:00:00.000Z" }
```

---

## Estructura del proyecto

```
cursomate-api/
├── sql/
│   ├── schema.sql          # Tablas MySQL
│   └── seed.sql            # Datos de prueba
├── src/
│   ├── index.ts            # Entry point Express
│   ├── types/
│   │   └── index.ts        # Interfaces TypeScript
│   ├── db/
│   │   └── connection.ts   # Pool mysql2
│   ├── utils/
│   │   ├── jwt.ts          # Sign / verify tokens
│   │   └── response.ts     # Helpers de respuesta uniforme
│   ├── middlewares/
│   │   └── auth.middleware.ts  # JWT guard + rol guard
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── curso.controller.ts
│   │   ├── progreso.controller.ts
│   │   └── evaluacion.controller.ts
│   └── routes/
│       ├── index.ts
│       ├── auth.routes.ts
│       ├── curso.routes.ts
│       ├── progreso.routes.ts
│       └── evaluacion.routes.ts
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## Cómo conectar con el frontend Next.js

En tu proyecto CursoMATE, crea `lib/api.ts`:

```ts
const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getToken() {
  const session = sessionStorage.getItem('cm_session');
  return session ? JSON.parse(session).token : null;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.message);
  return json.data as T;
}

export const api = {
  login:          (email: string, password: string) =>
    apiFetch<{ token: string; usuario: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getEjes:        ()         => apiFetch<any[]>('/ejes'),
  getLeccion:     (id: string) => apiFetch<any>(`/lecciones/${id}`),
  getProgreso:    ()         => apiFetch<any[]>('/progreso'),
  marcarProgreso: (leccionId: string, campo: string) =>
    apiFetch<any>(`/progreso/${leccionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ campo }),
    }),
  enviarEvaluacion: (leccionId: string, respuestas: any[]) =>
    apiFetch<any>(`/evaluaciones/${leccionId}`, {
      method: 'POST',
      body: JSON.stringify({ respuestas }),
    }),
  getIntentos: (leccionId: string) =>
    apiFetch<any[]>(`/evaluaciones/${leccionId}/intentos`),
};
```

Y agrega en `.env.local` de Next.js:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

---

## Producción

```bash
npm run build
NODE_ENV=production npm start
```

Para deploy en servidor Linux con PM2:

```bash
npm install -g pm2
npm run build
pm2 start dist/index.js --name cursomate-api
pm2 save
pm2 startup
```
