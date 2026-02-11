# BITÁCORA DE PROYECTO: JUEGAIA

Este documento sirve como registro centralizado del estado del proyecto, cambios recientes y hoja de ruta. Su objetivo es permitir que cualquier agente o desarrollador entienda rápidamente el contexto y continúe el trabajo.

## 📅 Estado Actual (Actualizado: 2026-02-11)

**Fase:** Estabilización y Corrección de Bugs (Rifas vs Bingos).
**Entorno:** Desarrollo Local (`npm run dev`) con conexión a Supabase Producción.

### 🚀 Últimos Cambios Importantes

#### 1. Corrección Crítica: Separación de Rifas y Bingos
- **Problema Detectado:** Al crear una "Rifa" desde el frontend, el sistema la guardaba erróneamente en la tabla de `bingo_games`.
- **Causa:** El procedimiento almacenado `create_game_service` en Base de Datos ignoraba el parámetro `p_service_type` e insertaba todo en `bingo_games`.
- **Solución:** Se reescribió la función SQL (`sql/fix_create_game_service.sql`) para:
    - Distinguir entre `BINGO` y `RAFFLE`.
    - Insertar en la tabla correcta (`bingo_games` o `raffles`).
    - Cobrar el costo de creación adecuado según configuración (`bingo_creation_price` o `raffle_creation_price`).

#### 2. Seguridad (Row Level Security - RLS)
- **Problema:** Supabase reportaba 125 alertas de seguridad. Las tablas eran públicas y vulnerables.
- **Solución:** Se creó el script `sql/db_security_hardening.sql` para:
    - **Transacciones:** Solo el usuario dueño puede ver sus propios movimientos.
    - **Comisiones:** Solo visibles para el beneficiario o la fuente.
    - **Perfiles:** Públicos para lectura (necesario para referidos), pero solo editables por su dueño.
    - **Juegos:** Visibles para todos, solo administrables por Admins.

#### 3. Estructura de Datos (Rifas)
- Se aseguró la existencia de la tabla `raffles` y `tickets` mediante el script `sql/db_create_raffles.sql`.
- Esto garantiza que el backend tenga donde guardar las rifas ahora que la función de creación está arreglada.

---

## 📂 Archivos Clave Creados/Modificados

| Archivo | Descripción |
| :--- | :--- |
| `sql/fix_create_game_service.sql` | **CRÍTICO**. Script para arreglar la creación de rifas. Debe ejecutarse en Supabase. |
| `sql/db_security_hardening.sql` | Script para activar seguridad RLS y proteger datos de usuarios. |
| `sql/db_create_raffles.sql` | Script de respaldo para crear tablas `raffles` y `tickets` si no existen. |
| `.env` | Configuración local con credenciales de Supabase (No subir al repo). |

---

## 📝 Pasos Pendientes (To-Do)

1.  [ ] **Ejecutar Scripts SQL en Supabase**:
    - El usuario debe correr los scripts generados en el Editor SQL de su proyecto Supabase para aplicar los cambios.
2.  [ ] **Validación de Flujo de Rifa**:
    - Crear una Rifa nueva y verificar que aparezca en la tabla `raffles` y no en `bingo_games`.
    - Verificar que se descuente el saldo correctamente.
3.  [ ] **Validación de Compra de Boleta**:
    - Probar la reserva y compra de un ticket de rifa con la nueva estructura.
4.  [ ] **Revisión de Alertas Restantes**:
    - Volver a revisar el panel de Supabase para ver si bajaron las alertas de seguridad después de aplicar el hardening.

---

## 💡 Notas Técnicas para Agentes Futuros

- **Stack:** Vite + React + Supabase.
- **Base de Datos:** PostgreSQL (vía Supabase).
- **Lógica de Negocio:** Gran parte de la lógica crítica (creación de juegos, pagos, comisiones MLM) reside en **Procedimientos Almacenados (RPCs)** en la carpeta `sql/`. **Revisar siempre los SQLs antes de tocar el código JS de `storage.js`**.
- **Autenticación:** Supabase Auth.
