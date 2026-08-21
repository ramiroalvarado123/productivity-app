# Mi Progreso — guía para Ramiro

Esta carpeta contiene el código completo de la versión actual de **Mi Progreso**.

## 1. Abrir el proyecto en VS Code

1. Descomprimí el archivo ZIP.
2. Abrí Visual Studio Code.
3. Elegí **File > Open Folder...**.
4. Seleccioná la carpeta `mi-progreso-vscode`.

No abras archivos sueltos: abrí la carpeta completa.

## 2. Instalar lo necesario

La aplicación necesita Node.js 22.13 o una versión posterior.

Abrí **Terminal > New Terminal** dentro de VS Code y ejecutá:

```bash
node -v
npm install
```

Si `node -v` muestra una versión menor que `22.13`, instalá Node.js 22 antes de continuar.

## 3. Abrir la vista previa local

En la terminal ejecutá:

```bash
npm run dev
```

VS Code mostrará una dirección local. Abrila en el navegador. Para detener la vista previa, volvé a la terminal y presioná `Control + C`.

La cuenta de ChatGPT, la base de datos persistente y las variables secretas pertenecen al entorno donde está publicada la aplicación. Por eso, al correr esta copia fuera de ese entorno algunas funciones conectadas pueden necesitar una configuración local adicional. No coloques claves privadas dentro del código ni las subas a GitHub.

## 4. Qué contiene cada carpeta

- `app/`: pantallas, estilos y funciones principales.
- `app/api/`: conexión con la base de datos y funciones de IA.
- `db/`: estructura de los datos.
- `drizzle/`: migraciones de la base de datos.
- `public/`: imágenes e íconos.
- `scripts/`: comandos internos del proyecto.
- `worker/`: servidor usado para publicar la aplicación.

Los archivos que más probablemente van a editar al principio son:

- `app/progress-client.tsx`: contenido e interacciones del panel.
- `app/globals.css`: colores, tamaños, distribución y diseño visual.
- `app/page.tsx`: pantalla inicial y acceso.
- `db/schema.ts`: estructura de los registros guardados.

## 5. Crear el repositorio compartido

La forma más simple desde VS Code es:

1. Abrí el ícono **Source Control** de la barra izquierda.
2. Elegí **Initialize Repository**.
3. Confirmá los archivos con el botón **Commit**.
4. Elegí **Publish Branch** o **Publish to GitHub**.
5. Seleccioná **Private repository**.
6. En GitHub, abrí **Settings > Collaborators** e invitá a tu amigo.

La carpeta ya incluye un `.gitignore`, por lo que dependencias, archivos temporales y secretos no deberían subirse al repositorio.

## Importante

GitHub comparte y guarda el código, pero no publica automáticamente esta aplicación ni copia su base de datos. Después de crear el repositorio hay que conectar una plataforma de despliegue y configurar autenticación, base de datos y secretos para tener una vista previa común que se actualice con cada cambio.
