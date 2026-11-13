# Carta de cumpleaños interactiva 💗

Proyecto inicial para VS Code: carta romántica, trivia de 3 preguntas, intentos ilimitados hasta 3/3, elección de un regalo y bloqueo permanente después de elegir. La carta sigue disponible después del bloqueo.

## Requisitos
- Node.js LTS
- VS Code
- Cuenta Supabase
- Cuenta GitHub y Vercel para publicarla

## 1. Abrir el proyecto
Extrae el ZIP, abre la carpeta `carta-cumple-romantica` en VS Code y abre Terminal > New Terminal.

Ejecuta:
```bash
npm install
```

Copia `.env.example` y crea un archivo llamado `.env` en la raíz. Pega la URL y la clave pública (anon/publishable) de Supabase:
```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```
Nunca pongas la `service_role` en `.env` ni en archivos del frontend.

## 2. Crear Supabase
1. Crea un proyecto en https://supabase.com.
2. Ve a SQL Editor y ejecuta todo `supabase/schema.sql`.
3. Ve a Authentication > Users y crea dos usuarios con correo y contraseña:
   - tu cuenta de administrador
   - la cuenta participante para Raquel
4. Copia el UUID de cada usuario.
5. En SQL Editor ejecuta (reemplaza los UUID):
```sql
insert into public.profiles(id,role,display_name) values
('UUID_DE_TU_ADMIN','admin','Administrador'),
('UUID_DE_PARTICIPANTE','participant','Raquel');
```
6. En Project Settings > API copia Project URL y la clave pública anon/publishable al `.env`.

## 3. Instalar y publicar las funciones seguras
Instala Supabase CLI siguiendo https://supabase.com/docs/guides/cli. Inicia sesión y vincula el proyecto desde la terminal de VS Code:
```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy start-session
supabase functions deploy submit-attempt
supabase functions deploy choose-gift
```
Las funciones usan secretos gestionados por Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Supabase los proporciona en el entorno de Edge Functions. No copies la service role al frontend.

## 4. Personalizar carta y trivia
Edita `CONFIG` al principio de `src/main.js`:
- `displayName`: nombre o apodo.
- `title`, `subtitle`, `letter`: texto de la carta.
- `musicFile`: ruta de tu audio.
- `questions`: textos y opciones visibles.

Para cambiar preguntas y respuestas correctas, también debes actualizar la tabla `questions` desde Supabase Table Editor. `correct_option` usa índices desde cero: 0 = primera opción, 1 = segunda, 2 = tercera, 3 = cuarta. Nunca escribas respuestas correctas en el frontend.

Para editar regalos, cambia `CONFIG.gifts` y actualiza la tabla `gifts` en Supabase. Los IDs deben coincidir: `dulces`, `comida`, `sorpresa`.

## 5. Música y fotos
Puedes crear `public/music/` y poner un archivo de audio propio llamado `cancion.mp3`. El navegador normalmente exige que la persona pulse el botón de música antes de reproducir audio. Puedes agregar imágenes propias y luego personalizar el HTML/CSS.

## 6. Probar en laptop
```bash
npm run dev
```
Abre la URL local que muestra Vite (normalmente http://localhost:5173).

## 7. Publicar para que abra desde cualquier lugar
1. Sube el proyecto a un repositorio privado de GitHub.
2. En Vercel importa ese repositorio.
3. En Vercel > Project Settings > Environment Variables agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Haz Deploy. Vercel te dará un enlace permanente.
5. Cada cambio que subas a GitHub se publicará en Vercel automáticamente.

No necesitas Cloudflare Tunnel ni dejar tu laptop encendida.

## 8. Comprobaciones importantes
- Prueba con la cuenta participante y revisa que `first_visit_at` se registre al entrar.
- Falla la trivia y confirma que permite repetir.
- Acierta las tres y confirma que muestra los regalos.
- Elige uno y vuelve a entrar: debe mostrar la elección y no la trivia.
- Prueba en un celular real y en laptop.

## Límites de esta primera versión
- El panel de administrador muestra participantes e intentos recientes; la edición visual completa de carta/preguntas/regalos queda como siguiente mejora. Los textos visibles se editan en `src/main.js` y las respuestas correctas en Supabase.
- Esta versión está preparada para una sola persona participante. No compartas su contraseña.
- Los planes gratuitos de hosting/base de datos pueden tener límites o pausas por inactividad. Comprueba las condiciones actuales de cada proveedor antes de depender de disponibilidad permanente.
- Cambia las contraseñas de prueba antes de compartir el enlace.
