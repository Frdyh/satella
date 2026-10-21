# Guía: conectar Satella con WhatsApp real (modo prueba de Meta)

Esta guía es para el PC donde corre el proyecto. Al terminarla, al escribirle por WhatsApp al número de prueba de Meta te responde el bot de Satella.

**Tiempo estimado:** 30–45 minutos la primera vez. Hazlo **al menos un día antes de la demo**: cada número que vaya a participar tiene que registrarse en Meta con un código que llega por WhatsApp.

> Meta cambia seguido los nombres de los menús de su panel. Si un botón no se llama exactamente igual, busca el más parecido. Lo importante son los **valores** que hay que copiar.

## Qué vas a necesitar

- El proyecto funcionando en el PC (`npm run dev` o `start.bat` / `start.command`) con la rama `whatsapp` y las migraciones aplicadas (`cd satella-backend && npx prisma migrate dev`).
- Una cuenta de Facebook (para entrar a Meta for Developers).
- Una cuenta gratis en [ngrok](https://ngrok.com): crea un túnel para que Meta, que está en internet, pueda llegar al backend que corre en tu PC.
- Los celulares que van a participar en la demo, con WhatsApp.

## Cómo encaja todo

```
Celular con WhatsApp ──> Meta (número de prueba) ──> ngrok (internet) ──> tu PC: backend en el puerto 4000
                                                                           /api/whatsapp/webhook
```

Meta le avisa al backend cada mensaje que llega, y el backend responde usando la API de Meta. Todo vive en el mismo backend de siempre: no hay un servidor aparte.

## Paso 1 — Crear la app en Meta

1. Entra a <https://developers.facebook.com> e inicia sesión con Facebook. Si es la primera vez, acepta registrarte como desarrollador.
2. **Mis apps → Crear app**. Cuando pregunte el caso de uso, elige el de **WhatsApp** ("Conectar con clientes a través de WhatsApp" o similar). Si no aparece, elige el tipo **Empresa / Business**.
3. Ponle un nombre (por ejemplo "Satella Demo") y créala. Si te pide una cuenta comercial (Business Portfolio), deja que cree una nueva.
4. Dentro de la app, agrega el producto **WhatsApp** si no quedó agregado.

## Paso 2 — Copiar los datos de la API

En **WhatsApp → Configuración de la API** (*API Setup*) vas a ver un **número de prueba** que Meta te regala. Copia:

| Dato en Meta | Variable en `satella-backend/.env` |
|---|---|
| **Identificador del número de teléfono** (*Phone number ID*), son solo números | `WA_PHONE_NUMBER_ID` |
| **Token de acceso temporal** (*Temporary access token*), botón "Generar token" | `WA_ACCESS_TOKEN` |

Después, en **Configuración de la app → Básica** (*App settings → Basic*), haz clic en **Mostrar** junto a **Clave secreta de la app** (*App secret*) y cópiala en `WA_APP_SECRET`.

Por último, **inventa** una palabra secreta para `WA_VERIFY_TOKEN`, por ejemplo `satella-demo-2026`. La vas a pegar igual en Meta en el paso 5.

Tu `satella-backend/.env` debe quedar así (con tus valores):

```
WA_ACCESS_TOKEN=EAAG...muy largo...
WA_PHONE_NUMBER_ID=123456789012345
WA_APP_SECRET=0a1b2c3d4e5f...
WA_VERIFY_TOKEN=satella-demo-2026
WA_GRAPH_VERSION=v26.0
ENABLE_WA_SIMULATOR=true
```

> ⚠️ **El token temporal vence en unas 24 horas.** El día de la demo genera uno nuevo en la misma pantalla, pégalo en `.env` y reinicia el backend.
>
> 🔒 Nunca subas el `.env` al repositorio (ya está en `.gitignore`).

**Reinicia el backend** para que lea los valores nuevos.

## Paso 3 — Registrar los números que van a participar

El número de prueba de Meta **solo puede responderles a números que agregues a mano** (hay un máximo pequeño, normalmente 5).

1. En **Configuración de la API**, en el campo **Para** (*To*), elige **Administrar lista de números** (*Manage phone number list*).
2. Agrega cada celular de la demo con el indicativo (`+57 300 111 2233`).
3. A cada uno le llega un código por WhatsApp: escríbelo en Meta para confirmar.

Agrega todos los números que van a escribirle al bot, **también el del amigo que se va a registrar en vivo**. Si un número no está en la lista, el bot recibe su mensaje pero Meta no le deja responderle.

## Paso 4 — Abrir el túnel con ngrok

1. Instala ngrok desde <https://ngrok.com/download> (en Windows puedes usar la Microsoft Store).
2. En el panel de ngrok copia tu **authtoken** y ejecútalo una sola vez:
   ```
   ngrok config add-authtoken TU_AUTHTOKEN
   ```
3. **Recomendado:** en el panel de ngrok, en **Domains**, crea tu **dominio gratis** (algo como `nombre-raro.ngrok-free.app`). Así la URL no cambia cada vez que reinicias ngrok.
4. Con el backend corriendo, abre **otra terminal** y ejecuta:
   ```
   ngrok http 4000 --url nombre-raro.ngrok-free.app
   ```
   Si no creaste dominio fijo, usa solo `ngrok http 4000` y copia la URL `https://…` que aparece. **Esa URL cambia cada vez que reinicias ngrok**, y tendrías que repetir el paso 5.
5. Comprueba que funciona: abre en el navegador `https://nombre-raro.ngrok-free.app/api/health`. Debe responder `{"status":"ok",...}`.

Deja esa terminal abierta durante toda la demo.

## Paso 5 — Configurar el webhook en Meta

1. En Meta: **WhatsApp → Configuración** (*Configuration*), sección **Webhook → Editar**.
2. **URL de devolución de llamada** (*Callback URL*):
   ```
   https://nombre-raro.ngrok-free.app/api/whatsapp/webhook
   ```
3. **Token de verificación** (*Verify token*): exactamente el mismo valor de `WA_VERIFY_TOKEN`.
4. **Verificar y guardar**. En la terminal del backend debe aparecer `[WhatsApp] Webhook verificado por Meta ✅`. Si sale error, revisa la sección de problemas de abajo.
5. En **Campos del webhook** (*Webhook fields*), busca **`messages`** y **suscríbete** (Subscribe). Sin esto, Meta no envía los mensajes.

## Paso 6 — Darles teléfono al personal de la demo

El bot reconoce a cada persona por su número, así que el personal tiene que tener su teléfono en Satella:

1. Entra al panel como `juan@satella.local` / `satella123`.
2. **CRUD → Usuarios**. Edita a **Diego Ramírez (Repartidor)** y pon en **Teléfono (WhatsApp)** el número del celular que hará de repartidor.
3. Si quieren mostrar el aviso al operario por WhatsApp, edita a **María Fernanda López (Operador)** con el número de un tercer celular.

Un mismo número **no puede ser cliente y personal a la vez**: el sistema no te deja guardarlo. El amigo que se registra en vivo no debe estar como cliente ni como usuario.

> Alternativa: definir `SEED_TEL_REPARTIDOR` y `SEED_TEL_OPERARIO` en `.env` y correr `npm run db:seed`. Ojo: **el seed borra todos los datos** y vuelve a cargar los de ejemplo.

## Paso 7 — Probar

Desde el celular del repartidor, escríbele **hola** al número de prueba de Meta, el que aparece en "Configuración de la API". Debe responderte pidiendo el PIN. Si responde, ¡ya está conectado! 🎉

## Ensayo de la demo (propuesta)

| Quién | Qué hace |
|---|---|
| **Repartidor** (tú, con tu celular) | En el panel, alguien genera tu PIN en **WhatsApp → Generar PIN**. Escribes "hola" → PIN → **Mi ruta** → **Confirmar entrega** → **Reportar problema** |
| **Cliente nuevo** (un amigo) | Escribe "hola" → acepta el tratamiento de datos → nombre, dirección, ciudad → confirma. Luego "menu" → **Hacer pedido** |
| **Operario** (en el panel) | Ve el pedido nuevo en **pendiente** y lo **confirma** (el stock baja). Ve la alerta del repartidor en **WhatsApp → Alertas** y la marca atendida |

### Plan B: el simulador

Si el día de la demo falla internet, Meta o ngrok, usa el **simulador**: panel → **WhatsApp → Abrir simulador**. Es el mismo bot, con los mismos flujos y la misma base de datos, pero sin Meta. Puedes escribir como cualquier cliente, el repartidor, la operaria o un número nuevo, y ver cómo le llega a María el aviso del repartidor. Necesita `ENABLE_WA_SIMULATOR=true` en `.env`.

> 🔒 El simulador permite escribir haciéndose pasar por cualquier teléfono. Déjalo en `false` fuera de desarrollo y de la demo.

## Si algo falla

Mira la terminal del backend: los errores del canal empiezan con `[WhatsApp]`.

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Meta dice que no pudo verificar el webhook, y en la terminal: `Verificación del webhook rechazada (403)` | El verify token no coincide | Pega en Meta exactamente el valor de `WA_VERIFY_TOKEN` |
| Meta dice que no pudo verificar el webhook, y en la terminal no aparece nada | ngrok no está corriendo o la URL está mal | Abre `https://…/api/health` en el navegador; revisa que la URL termine en `/api/whatsapp/webhook` |
| El bot no responde y en la terminal no aparece `POST /api/whatsapp/webhook` | No te suscribiste al campo `messages`, o la URL de ngrok cambió | Paso 5 (campos del webhook); si no usas dominio fijo, actualiza la URL en Meta |
| En la terminal: `Webhook rechazado (401): la firma no coincide` | `WA_APP_SECRET` no corresponde a esta app | Copia de nuevo la clave secreta (paso 2) y reinicia el backend |
| `[WhatsApp] Meta respondió 401 (código 190)` | El token de acceso venció | Genera un token nuevo (paso 2) y reinicia el backend |
| `[WhatsApp] Meta respondió 400 (código 131030)` | Ese número no está en la lista de destinatarios | Agrégalo y confírmalo (paso 3) |
| `[WhatsApp] Falta WA_PHONE_NUMBER_ID o WA_ACCESS_TOKEN` | Faltan valores en `.env` o no reiniciaste el backend | Paso 2 |
| El repartidor recibe el saludo de cliente | Su número está registrado como cliente, no como usuario | Paso 6 |
| La operaria no recibe el aviso por WhatsApp | No le ha escrito al bot en las últimas 24 h | Que le escriba "hola" al bot antes de la demo. El aviso igual aparece en el panel |
