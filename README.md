# Proyecto Hogar

App de organización del hogar para uso compartido entre dos personas. Cubre cuatro secciones:

- **Comida** — inventario de almacén + recetario
- **Compras** — listas de compras colaborativas
- **Organización** — tareas + calendario
- **Economía** — gastos, ingresos y gráficos

SPA mobile-first (React + Vite + Supabase + Tailwind/shadcn).

## Requisitos

- Node 18+
- Cuenta en [Supabase](https://supabase.com)

## Setup

1. Clonar el repo e instalar dependencias:
   ```bash
   npm install
   ```

2. Crear `.env.local` en la raíz con las credenciales de Supabase:
   ```
   VITE_SUPABASE_URL=https://<proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```

3. Asegurarse de tener las tablas en Supabase (ver `entities/` para los schemas).

## Comandos

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run preview    # servir el build local
npm run lint       # ESLint (solo errores)
npm run typecheck  # tsc checkJs
```

## Deploy

El build genera la carpeta `dist/`. Se puede servir con cualquier hosting estático (Vercel, Netlify, etc.).
