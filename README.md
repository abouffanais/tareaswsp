# KC Tareas WSP — Deploy vía GitHub + Vercel

## Estructura
```
kc-tareas-wsp/
├── api/
│   └── whatsapp-webhook.js   → endpoint del webhook de Twilio
├── public/
│   └── dashboard.html         → dashboard visual
├── package.json
└── .gitignore
```

## 1. Subir a GitHub

1. Ve a https://github.com/new y crea un repositorio nuevo (ej: `kc-tareas-wsp`), puede ser privado.
2. En tu computador, abre una terminal en esta carpeta descargada y ejecuta:

```bash
git init
git add .
git commit -m "Inicial: bot de tareas por WhatsApp"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/kc-tareas-wsp.git
git push -u origin main
```

(Reemplaza `TU_USUARIO` por tu usuario de GitHub. Si te pide login, usa tu usuario + un Personal Access Token como contraseña — GitHub ya no acepta contraseña normal por git.)

## 2. Conectar con Vercel

1. Entra a https://vercel.com/new
2. Selecciona **"Import Git Repository"** y elige `kc-tareas-wsp`.
3. En **"Environment Variables"** (antes de darle Deploy), agrega:
   - `ANTHROPIC_API_KEY` → tu API key de Anthropic (console.anthropic.com → API Keys)
   - `APPS_SCRIPT_URL` → `https://script.google.com/macros/s/AKfycbwaDm5bFRP4LH6WCF1fjDOQR5Fil0rnjNIhfsanzw7XR_8z0C7kKm6HBdgoKJe-s32PIQ/exec`
   - `SHARED_SECRET` → `kc_2026_ab`
4. Clic en **"Deploy"**.
5. Cuando termine, te da una URL tipo `https://kc-tareas-wsp.vercel.app`

## 3. Conectar Twilio al webhook

En la consola de Twilio → Messaging → Try it out → Send a WhatsApp message → pestaña **"Sandbox settings"**:

Campo **"WHEN A MESSAGE COMES IN"** → pega:
```
https://kc-tareas-wsp.vercel.app/api/whatsapp-webhook
```
Método: **POST** → Guardar.

## 4. Probar

Desde tu WhatsApp (ya conectado al sandbox), envía:
```
Consultar figura remuneración abogada internacional / Kitchen Center Internacional / Urgente
```

Deberías recibir la confirmación automática, y ver la fila nueva en tu Sheet `KC_Tareas_WSP`.

## 5. Dashboard

Una vez desplegado, tu dashboard queda disponible en:
```
https://kc-tareas-wsp.vercel.app/dashboard.html
```
La primera vez te pedirá la URL del Apps Script (la misma de arriba) — la guarda en el navegador.

## Actualizaciones futuras

Cualquier cambio que quieras hacer al webhook o al dashboard: edita el archivo, luego:
```bash
git add .
git commit -m "descripción del cambio"
git push
```
Vercel despliega automáticamente con cada push a `main`.
