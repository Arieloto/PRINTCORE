# PrintCore 3D Chile

Sistema integral para costeo y gestión de talleres de impresión 3D en Chile: costeo, cotizaciones, órdenes de trabajo, inventario, pagos y rentabilidad.

La aplicación combina React + Vite en el frontend con Express + SQLite en el backend. Los datos se guardan en SQLite y el frontend conserva `localStorage` como respaldo cuando la API no está disponible. El IVA mostrado en cotizaciones y reportes es solo un cálculo de precios; esta aplicación no emite ni reemplaza documentos tributarios.

## Versión 1.1.0

- Se retiraron las vistas y opciones para boletas, facturas y SII/DTE.
- Se mantienen las cotizaciones, órdenes de trabajo y comprobantes internos de pago.
- Las órdenes de trabajo generan instrucciones de acabado, pintura y ensamblaje según los procesos cotizados; el taller puede ajustarlas antes de imprimir la hoja A4.
- El IVA de las cotizaciones y los indicadores financieros es una estimación de precios; PrintCore no emite documentos tributarios ni los envía al SII.

## Requisitos

- Windows x64 para generar los instaladores documentados abajo.
- Node.js **22.12 o superior** y npm. Node 24 también está soportado; la aplicación se probó con Node 24.
- Las dependencias exactas se instalan desde `package-lock.json`.

> Node 20.11 ya no es suficiente: el servidor usa `node:sqlite` y la versión actual de Vite requiere una versión más reciente de Node.

## Desarrollo local

1. Instala las dependencias:

   ```bash
   npm ci
   ```

2. Inicia la API y el frontend:

   ```bash
   npm run dev
   ```

   Abre <http://localhost:3000>. Vite sirve el frontend y envía las llamadas `/api` al servidor Express en el puerto 3001. En desarrollo, la base SQLite está en `data/printcore.db`.

## Crear la aplicación de escritorio y los instaladores

Desde la raíz del proyecto, ejecuta:

```bash
npm ci
npm run lint
npm run desktop:dist
```

`desktop:dist` compila el frontend (`dist/`), empaqueta la API de Express y SQLite (`dist-electron/server.cjs`) y ejecuta electron-builder. Para esta versión, los artefactos de Windows x64 quedan en `release/`:

- `PrintCore-1.1.0-x64.exe`: instalador NSIS; permite elegir la carpeta de instalación y crea accesos directos.
- `PrintCore-1.1.0-portable.exe`: ejecutable portable.

Los instaladores generados actualmente no tienen firma digital; Windows puede mostrar una advertencia de editor desconocido. Para distribuirlos públicamente sin esa advertencia se necesita firmar el ejecutable con un certificado de código.

La versión del nombre se toma de `version` en `package.json`. Para probar la ventana de Electron sin crear los instaladores:

```bash
npm run desktop
```

Para generar solamente la carpeta de la aplicación desempaquetada:

```bash
npm run desktop:pack
```

### Datos de la aplicación instalada

La aplicación empaquetada guarda la base de datos fuera de la carpeta de instalación, en el directorio de datos de usuario de Windows (`%APPDATA%\PrintCore\printcore.db`). Así los datos sobreviven a actualizaciones y no requieren permisos de escritura en `Program Files`. Para respaldarlos, cierra PrintCore y copia `printcore.db` desde esa ubicación.

## Scripts disponibles

| Script | Descripción |
| --- | --- |
| `npm run dev` | API de desarrollo y frontend Vite; frontend en el puerto 3000 y API en el 3001 |
| `npm run dev:web` | Solo frontend Vite |
| `npm run dev:api` | Solo API de desarrollo |
| `npm run build` | Compila el frontend de producción en `dist/` |
| `npm run build:server` | Empaqueta el servidor para Electron en `dist-electron/server.cjs` |
| `npm run desktop` | Compila frontend y servidor y abre Electron |
| `npm run desktop:pack` | Compila y genera la aplicación desempaquetada en `release/` |
| `npm run desktop:dist` | Compila y genera el instalador NSIS y la versión portable |
| `npm run preview` | Sirve localmente el frontend compilado |
| `npm run start` | Compila el frontend y sirve la aplicación web con Express en el puerto 3000 |
| `npm run lint` | Verifica tipos con TypeScript (`tsc --noEmit`) |
| `npm run clean` | Elimina únicamente la carpeta `dist/` |

## Estructura

```text
src/                    Frontend React y módulos de la aplicación
  components/           Vistas por área (cotizaciones, taller, inventario, etc.)
  services/             Costeo, almacenamiento y utilidades
  data/printerPresets.ts Presets de impresoras
  types/                Tipos de dominio y de escritorio
server/                 API Express y persistencia SQLite
electron/               Proceso principal y puente seguro de Electron
build/                  Recursos de electron-builder, incluido el icono de Windows
```

## Primeros pasos

La app parte vacía. Para empezar a cotizar:

1. Ve a **Configuración de Costos y Taller** e ingresa los datos del negocio, sueldo objetivo, horas de producción y factores de costo.
2. Carga tu **Flota de Impresoras** y tu catálogo de **Materiales** (o usa los presets de referencia).
3. Usa **Costeo Inteligente** para generar cotizaciones o prueba el asistente de lenguaje natural. Por ejemplo: *“Necesito PLA, bobina 18 mil, la pieza pesa 120 gramos, demora 6 horas y son 3 piezas”*.
