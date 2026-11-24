# ¿Qué cocino hoy?

Aplicación web para guardar recetas, gestionar ingredientes de la despensa y
ver qué recetas puedes preparar según los ingredientes disponibles. Usa
Next.js, TypeScript, Tailwind CSS y Supabase.

## URL pública

[https://prueba-tecnica-eight-inky.vercel.app/](https://prueba-tecnica-eight-inky.vercel.app/)


## Flujo de trabajo

```text
Orquestador → Develop → Testing → (fallos) → Develop → PASS
```

## Guías del proyecto

- [CLAUDE.md](./CLAUDE.md)
- [Agente Develop](./.claude/agents/develop.md)
- [Agente Testing](./.claude/agents/testing.md)
- [Registro de pruebas](./docs/testing-log.md)

## Ejecución local

Requisitos: Node.js y npm.

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea `.env.local` a partir de `.env.example` y configura las variables
   requeridas:

   ```text
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

   Usa la URL del proyecto Supabase y su clave pública `anon`. No pongas claves
   `service_role` ni contraseñas en archivos versionados.

3. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Abre [http://localhost:3000](http://localhost:3000).

Comprobaciones disponibles:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
