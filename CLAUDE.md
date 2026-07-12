# CLAUDE.md

Guía para Claude Code al trabajar en este repo. Mantenerla corta, concreta y al día.

## Qué es este proyecto

App de organización del hogar pensada para uso compartido entre dos personas (Leandro y su pareja). Cubre 4 secciones principales: **Comida** (inventario + recetas), **Compras** (listas), **Organización** (tareas + calendario) y **Economía** (gastos + ingresos + gráficos).

Es una SPA mobile-first (max-w-lg, bottom nav, swipe entre páginas principales). El stack es **React + Vite + Supabase + Tailwind/shadcn**.

## Comandos

```bash
npm install            # primera vez
npm run dev            # Vite dev server
npm run build          # build de producción
npm run preview        # servir el build
npm run lint           # eslint --quiet (solo errores)
npm run lint:fix       # eslint --fix
npm run typecheck      # tsc -p ./jsconfig.json (checkJs en .jsx)
```

No hay tests configurados.

## Variables de entorno

Crear `.env.local` en la raíz:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Stack

- **React 18** + **Vite 6** (JSX puro, sin TS en componentes — `jsconfig.json` con `checkJs: true`)
- **React Router 6** (rutas registradas en `src/pages.config.js`, no file-based)
- **TanStack Query 5** para data fetching y caché (`src/lib/query-client.js`)
- **Supabase JS 2** para auth + DB + realtime
- **Tailwind 3** + **shadcn/ui** (style `new-york`, `baseColor: neutral`, prefix vacío)
- **Radix UI** primitives (vienen con shadcn)
- **framer-motion** para animaciones, **lucide-react** para iconos
- **react-hook-form** + **zod** para formularios
- **recharts** para gráficos (Economía)
- Otros: `date-fns`, `moment`, `react-leaflet`, `three`, `jspdf`, `html2canvas`, `react-quill`, `@hello-pangea/dnd`, `canvas-confetti`

## Estructura del repo

```
entities/                  # JSON schemas del dominio (no son código JS)
  AppSettings, CalendarEvent, ChartConfig, CustomCategory,
  Expense, Income, InventoryItem, Recipe, ShoppingList, Task

src/
  api/apiClient.js         # Wrapper Supabase: entidades + auth. Punto único de acceso a datos.
  pages/                   # Economy, Food, Organization, Shopping, Settings,
                           # RecipeDetail, Login
  pages.config.js          # Registro central { Pages, Layout, mainPage: 'Food' }
  Layout.jsx               # Layout global: temas, swipe handlers, BottomNav
  App.jsx                  # AuthProvider + QueryClientProvider + Router
  main.jsx                 # Entry point
  components/
    ui/                    # shadcn — NO modificar a mano, usar `npx shadcn add`
    common/                # PageHeader, EmptyState, CategoryFilter
    navigation/            # BottomNav, SwipeablePages
    food/, economy/,
    organization/,
    shopping/              # Componentes específicos por sección
    HouseholdSetup.jsx     # Onboarding multi-usuario
    UserNotRegisteredError.jsx
  hooks/
    use-mobile.jsx
    useRealtimeQuery.js    # Suscripción a postgres_changes que invalida queries
    useGoogleSheets.js
  lib/
    AuthContext.jsx        # useAuth(): user, isAuthenticated, logout
    supabase.js            # cliente único de Supabase
    query-client.js        # QueryClient compartido
    utils.js               # cn() (clsx + tailwind-merge), isIframe
    PageNotFound.jsx
  utils/index.ts           # createPageUrl(name) → '/Name-With-Dashes'
  index.css                # Tailwind + variables CSS de tema
```

Alias path: **`@/*` → `./src/*`** (configurado en `jsconfig.json` y `vite.config.js`).

## Modelo de datos

Las entidades viven en `entities/` como JSON schemas (campos, enums, requeridos). Las **tablas** Supabase correspondientes están mapeadas en `src/api/apiClient.js`:

| Entidad           | Tabla Supabase       |
|-------------------|----------------------|
| InventoryItem     | `inventory_items`    |
| Recipe            | `recipes`            |
| ShoppingList      | `shopping_lists`     |
| Task              | `tasks`              |
| CalendarEvent     | `calendar_events`    |
| Expense           | `expenses`           |
| Income            | `income`             |
| CustomCategory    | `custom_categories`  |
| AppSettings       | `app_settings`       |
| ChartConfig       | `chart_configs`      |

Convenciones:
- Toda tabla tiene `user_id` (que en realidad es el **owner_id del hogar**, ver abajo) y `created_at`.
- En el código se usa `created_date`; el wrapper lo remapea a `created_at` al ordenar.
- Textos del dominio están en **español** (categorías, enums como `pendiente/en_progreso/completada`, `ambos/yo/pareja`, etc.). Mantener.

### Multi-tenant (hogar compartido)

`getOwnerId()` en el wrapper busca en la tabla `household_links` el `owner_id` asociado al usuario logueado; si no existe, usa el propio `user.id`. **Todas las queries se filtran por ese owner_id**, así que dos miembros del mismo hogar comparten datos. Hay además tablas `households` y `household_members` que usa `HouseholdSetup.jsx` para crear/unirse a un hogar mediante un código de 6 caracteres.

`getOwnerId` cachea en módulo (`cachedOwnerId`) — si en algún punto se permite cambiar de hogar en runtime, hay que invalidar ese caché.

## Patrones obligatorios

**Acceso a datos** — siempre vía el wrapper + TanStack Query, nunca llamar a `supabase` directo desde una página/componente. Esto mantiene la lógica multi-tenant en un solo lugar:

```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';

const { data: tasks = [] } = useQuery({
  queryKey: ['tasks'],
  queryFn: () => api.entities.Task.list('-created_date'),
});

const create = useMutation({
  mutationFn: (data) => api.entities.Task.create(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
});
```

**Realtime** — para que los cambios del otro miembro del hogar se vean al instante:

```js
useRealtimeQuery('tasks', 'tasks'); // (nombreTabla, queryKey)
```

**Agregar una entidad nueva**:
1. Crear el JSON schema en `entities/MiEntidad`.
2. Agregar la tabla en Supabase con `user_id` y `created_at`.
3. Registrarla en `src/api/apiClient.js`.
4. Si necesita realtime, suscribirse con `useRealtimeQuery`.

**Agregar una página nueva**:
1. Crear `src/pages/MiPagina.jsx`.
2. Importarla y agregarla a `PAGES` en `src/pages.config.js`.
3. La ruta queda en `/MiPagina` (ver `createPageUrl` en `src/utils/index.ts`).
4. Si es una sección principal, agregarla al array `PAGES` en `Layout.jsx` (para swipe) y a `navItems` en `BottomNav.jsx`.

**UI**:
- Componentes shadcn ya generados: usarlos desde `@/components/ui/...`. Si falta uno: `npx shadcn add <name>` (config en `components.json`).
- Iconos: `lucide-react` exclusivamente.
- Animaciones: `framer-motion` (`motion`, `AnimatePresence`).
- Para combinar clases: `cn()` desde `@/lib/utils`.
- **Mobile-first**: contenedor principal `max-w-lg mx-auto`, respetar `env(safe-area-inset-*)` (clases helper `pt-safe`, `pb-safe`, `safe-area-pb` definidas en `Layout.jsx`).

**Tematización**:
- Hay 6 temas (`light`, `dark`, `coral`, `sage`, `ocean`, `sunset`) definidos en `Layout.jsx` y persistidos en `AppSettings.theme`.
- Usar las variables CSS `--theme-bg`, `--theme-primary`, `--theme-accent`, `--theme-text`, `--theme-card`, `--theme-border`, `--theme-muted` (o las clases utility `theme-card`, `theme-text`, `theme-muted`, `theme-primary`, `theme-primary-text`, `theme-accent`, `theme-border`).
- Para componentes nuevos: preferir variables de tema sobre colores hardcodeados.

**Auth**:
- `useAuth()` desde `@/lib/AuthContext` da `{ user, isAuthenticated, isLoadingAuth, logout, navigateToLogin }`.
- Login con Supabase. El token de Google (si se usa OAuth) se guarda en `localStorage.google_access_token`.
- Si el usuario no está autenticado, `App.jsx` renderiza `<Login />` en lugar de las rutas.

## Lint y typecheck

ESLint solo cubre `src/components/**`, `src/pages/**` y `src/Layout.jsx` (`src/lib/**` y `src/components/ui/**` están excluidos). Reglas activas relevantes:

- `unused-imports/no-unused-imports`: error
- `unused-imports/no-unused-vars`: warning, ignora prefijo `_`
- `react-hooks/rules-of-hooks`: error
- `react/prop-types`: off
- `react/react-in-jsx-scope`: off

`tsc` corre en modo `checkJs` sobre `src/components/**/*.js`, `src/pages/**/*.jsx` y `src/Layout.jsx`. No hay archivos `.ts` salvo `src/utils/index.ts`.

Nota: hay errores de typecheck pre-existentes en componentes shadcn (tipos de props no resueltos). No bloquean el build.

Antes de dar por terminado un cambio: `npm run lint && npm run build`.

## Cosas a evitar

- **No** llamar a `supabase` directo desde páginas/componentes — pasar por el wrapper para mantener la lógica multi-tenant en un solo lugar.
- **No** editar manualmente nada en `src/components/ui/` (lo regenera shadcn).
- **No** hardcodear colores; usar variables `--theme-*` o tokens de Tailwind.
- **No** asumir layout de desktop — todo se diseña para una columna `max-w-lg` con bottom nav fijo.
- **No** romper el contrato de `getOwnerId` (todo insert necesita `user_id = ownerId`); ya lo hace el wrapper en `create`, así que no hace falta pasar `user_id` desde el llamador.
- **No** agregar dependencias pesadas sin necesidad — el bundle ya es grande (three, leaflet, quill, jspdf, html2canvas).

## Pendientes

- [x] **Categorías de gastos desde Sheets** — al conectar Google, se importan automáticamente a Supabase las categorías usadas en Movimientos. Al crear una categoría nueva en la app se inserta en la hoja del año actual (antes de "Otros").
- [x] **Métodos de pago desde Sheets** — ídem para los medios de pago: se sincronizan automáticamente de Movimientos a Supabase al conectar.
- [x] **Gráficos en tab Mensual** — gráficos de categorías y medios de pago agregados al tab Mensual, encima del listado de movimientos.
- [x] **Tooltip de evolución por categoría** — tooltip muestra nombre de categoría + monto.
- [x] **Posición del selector Mensual/Anual/Comparar** — el toggle "Por año/Por mes" se movió al área del selector de período (arriba de las tabs), eliminado del contenido.
- [x] **Nuevos gráficos** — implementados: torta mensual, gastos por día, gasto acumulado del mes, balance mes a mes, balance acumulado (área), torta anual. Todos configurables por usuario vía panel de toggles (icono engranaje junto a las tabs). Preferencias guardadas en localStorage.
- [x] **Desincronización de fechas** — bug de timezone corregido: `computeAnualData` y filtros de comparar usaban `new Date()` (UTC midnight) en vez de `parseISO()` (local midnight), causando que gastos del día 1 de cada mes aparecieran en el mes anterior en el tab Anual. También corregido: PostgREST limitaba queries a 1000 filas por defecto; con 1304 expenses se cortaban los más viejos. Solucionado con `.limit(10000)` en el wrapper.
- [x] **Importar historial desde Sheets** — función `importarExistentes` en Apps Script corregida (fix de timezone con `Utilities.formatDate` + fix de race condition escribiendo "synced" antes del POST). Todos los registros históricos re-importados limpios a Supabase.
- [ ] **Shopping - Unidad predeterminada** — al agregar ítems en una lista, el valor predeterminado debe ser "unidades" en vez de "sin unidad".
- [ ] **Shopping - Editar ítems** — poder editar los ítems ya agregados a una lista.
- [ ] **Shopping - Limpiar cantidad inicial** — poder borrar el "1" al agregar un ítem; el campo puede quedar vacío pero no debe poder guardarse sin número.
- [ ] **Shopping - Completar lista parcial** — opción para completar lista aunque no estén todos los ítems marcados: elimina los comprados, los añade al almacén y deja en la lista los ítems sin marcar.
- [ ] **Shopping - Sin límite de tamaño** — la lista no debe tener altura máxima fija; evitar scroll interno dentro de la lista.
- [ ] **Shopping - Colapsar/expandir listas** — poder comprimir y expandir cada lista individualmente.
- [ ] **Shopping - Botón solapado** — cuando hay muchos ítems, el botón "agregar ítem" queda detrás del botón "agregar lista"; resolver el overlap sin romper el layout.
