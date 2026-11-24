# Registro de iteraciones Develop ⇄ Testing

| Tarea | Iteración | Resultado | Fallos encontrados | Corrección |
| ----- | --------- | --------- | ------------------ | ---------- |
| Tarea 1: Cliente Supabase + auth email/contraseña | 3 | PASS | Iteración 1: carga inicial y errores de operaciones auth; iteración 2: funciones de auth mayores de 40 líneas | Añadidos estados de carga/error y `finally`, limpieza de suscripción y extracción de componentes/lógica en funciones menores |
| Tarea 2: CRUD de recetas | 3 | PASS | Iteración 1: funciones CRUD/Supabase sin pruebas; iteración 2: helpers de tests mayores de 40 líneas | Añadidas pruebas de éxito, errores y sesión no autenticada; extraídos mocks y registros de tests en funciones cortas |
