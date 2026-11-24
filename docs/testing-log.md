# Registro de iteraciones Develop ⇄ Testing

| Tarea | Iteración | Resultado | Fallos encontrados | Corrección |
| ----- | --------- | --------- | ------------------ | ---------- |
| Tarea 1: Cliente Supabase + auth email/contraseña | 3 | PASS | Iteración 1: carga inicial y errores de operaciones auth; iteración 2: funciones de auth mayores de 40 líneas | Añadidos estados de carga/error y `finally`, limpieza de suscripción y extracción de componentes/lógica en funciones menores |
| Tarea 2: CRUD de recetas | 3 | PASS | Iteración 1: funciones CRUD/Supabase sin pruebas; iteración 2: helpers de tests mayores de 40 líneas | Añadidas pruebas de éxito, errores y sesión no autenticada; extraídos mocks y registros de tests en funciones cortas |
| Tarea 3: Gestión de la despensa | 4 | PASS | Iteración 1: faltaba migración/policies RLS para `pantry`; iteración 2: estado anterior visible al cambiar usuario y duplicados concurrentes; iteración 3: aislamiento al cambiar sesión en recetas e inconsistencia en normalización del índice | Añadida migración RLS con guardas de propietario y unicidad normalizada; aislado estado por usuario; alta maneja conflictos; normalización unificada y pruebas de regresión |
