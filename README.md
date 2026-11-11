# Sigo Firme

App para personas con ludopatía. Se instala en el celular como una app normal (PWA), funciona sin internet y, si la publicas con el servidor incluido, puede enviar un SMS real a un familiar con un toque.

## Qué incluye

- Botón "Necesito ayuda" siempre visible, con mensaje preparado para tu familiar.
- Ejercicio de 10 minutos para las ganas (respiración, temporizador, mensajes que frenan el impulso).
- Contador de días, ganas superadas y dinero que no perdiste.
- Tus razones para no apostar, que se muestran cuando sientes ganas.
- Diario de ánimo con los disparadores que más te activan, plan de emergencia, lista "cerrar la puerta", logros por días y meta de ahorro.
- (Opcional, no usado) `server.mjs` puede enviar SMS por Twilio, pero las cuentas de prueba solo permiten plantillas fijas. La app funciona sin servidor.

## 1. Probar en tu computador (sin enviar SMS)

Necesitas Node 18 o superior.

```
npm run probar
```

Abre http://localhost:3000. En modo prueba el servidor escribe el SMS en la consola y no envía nada.

## 2. Publicar con envío real de SMS

1. Crea una cuenta en Twilio y consigue un número o remitente. Revisa que el envío de SMS a tu país esté habilitado en tu cuenta.
2. Sube esta carpeta a un servicio que ejecute Node (Render, Railway, Fly.io u otro).
3. Comando de inicio: `node server.mjs`
4. Define estas variables de entorno (ver `.env.example`):
   - `API_TOKEN`: una clave larga que inventes tú.
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`
   - `FAMILY_PHONE`: teléfono de tu familiar con + y código de país.
5. El servicio debe usar HTTPS. Sin HTTPS el teléfono no instala la app.

El servidor limita los avisos a 3 por hora (`MAX_ALERTS_PER_HOUR`) y solo envía al número de `FAMILY_PHONE`, aunque alguien conozca la clave.

## 3. Instalar en el celular

- **Android (Chrome):** abre la dirección de tu servidor, menú de tres puntos, "Instalar app".
- **iPhone (Safari):** abre la dirección, botón Compartir, "Añadir a pantalla de inicio".

## 4. Activar el aviso automático

1. Abre la app, toca "Necesito ayuda" y abre "Aviso automático por SMS".
2. Marca que tu familiar aceptó recibir estos avisos (pídele permiso antes) y escribe la clave `API_TOKEN`.
3. Aparece el botón "Avisar ahora por SMS". La app solo dice que se envió cuando el servidor lo confirma.

Los botones "Llamar" y "Enviar mensaje" siguen disponibles y no necesitan servidor.

## Lo que esta versión no hace

- No envía notificaciones con la app cerrada. Eso requiere notificaciones push con un servidor y claves propias.
- No está en Google Play ni en la App Store. Para publicarla ahí se puede envolver con Capacitor (`npm i @capacitor/core @capacitor/cli`, `npx cap init`, `npx cap add android`). Apple y Google piden cuentas de desarrollador y revisión.
- No se probó con Twilio real. El servidor se probó en modo prueba (clave, límite por hora, validación de mensaje).
- Los datos personales (fecha, razones, contacto) se guardan en el navegador del teléfono. Si borras los datos del sitio, se pierden.

## Si estás en crisis

La app no reemplaza ayuda profesional. En Chile: Salud Responde 600 360 7777, y *4141 si sientes que puedes hacerte daño. Jugadores Anónimos tiene grupos de apoyo gratuitos. Confirma que los números sigan vigentes.

## Publicar gratis en GitHub Pages (sin servidor)

1. En tu repositorio de GitHub sube los archivos nuevos (`index.html` y `sw.js`) reemplazando los anteriores.
2. Entra a **Settings > Pages**.
3. En **Source** elige **Deploy from a branch**, rama **main**, carpeta **/ (root)** y toca **Save**.
4. Espera uno o dos minutos. La dirección será `https://TU-USUARIO.github.io/sigo-firme/`.
5. Abre esa dirección en el celular e instala la app como se explica arriba.
