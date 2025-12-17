# Plan de Pruebas General - JuegAIA

Este documento detalla paso a paso las pruebas necesarias para validar la estabilidad y funcionalidad completa de la plataforma tras la unificación del login y la limpieza de base de datos.

## 🟢 1. Autenticación y Seguridad (El "Smart Login")

- [ ] **Login Admin (Email):** Entrar con `elkindanielcastillo@gmail.com` + contraseña. Debe llevar al Dashboard Admin.
- [x] **Login Admin (Google):** Entrar con botón Google (mismo correo). Debe llevar al Dashboard Admin.
- [ ] **Login Jugador Nuevo:** Entrar con Celular `3001234567` (o cualquiera nuevo). Debe llevar al Lobby de Jugador (vacío si es nuevo).
- [ ] **Login Jugador Existente:** Entrar con un Celular que ya tenga tickets. Debe pedir PIN. Al ingresar PIN correcto, llevar al Lobby con sus tickets visibles.
- [ ] **Registro con Referido:**
    1. Usar link `.../login?ref=LGX4IK` (o código real).
    2. Registrarse como nuevo usuario (Google o Email).
    3. Verificar en **SuperAdmin Panel** (o BD) que la columna `referred_by` tenga el ID del dueño del código.
- [x] **Redirección Antigua:** Entrar a `.../register`. Debe redirigir automáticamente a `/login`.

---

## 🎟️ 2. Módulo de Rifas

### A. Gestión (Admin)
- [x] **Crear Rifa:** Crear rifa de 2 cifras, sin lotería (manual) o personalizada, precio $10.000.
- [ ] **IA Copywriter:** Probar generar texto con IA en el formulario de creación/edición.
- [x] **Editar Rifa:** Cambiar nombre o fecha de sorteo. Verificar cambios.
- [~] **Venta Manual (Admin):** Removido a petición del usuario (Usar vista pública).

### B. Experiencia Pública
- [ ] **Ver Rifa Pública:** Entrar al link público de la rifa.
- [ ] **Botón Volver:** Probar el botón "← Volver al Panel" y que lleve al Login/Lobby.
- [x] **Apartar Boleta (Flujo Nuevo):**
    - [x] Seleccionar número.
    - [x] Llenar nombre y celular.
    - [x] Confirmar.
    - [x] **Verificar Modal de Éxito:** Debe mostrar PIN y Botón WhatsApp.
    - [x] **Probar Botón WhatsApp:** Debe abrir chat con credenciales.
    - [x] **Probar Botón Descarga:** Debe bajar imagen JPG del ticket.
- [x] **Reingreso (Cookie/Smart):** Refrescar página de rifa. Intentar apartar otra boleta.
    - [x] **Debe autocompletar** el celular y reusar el PIN anterior automáticamente.

---

## 🎱 3. Módulo de Bingo

- [ ] **Crear Bingo:** Crear sala nueva en Dashboard.
- [ ] **Admin de Sala (TV):** Entrar a la vista "Jugar" (TV).
    - Probar sacar balotas.
    - Probar "Cantar Bingo" (resetear última balota si error).
- [ ] **Jugador:** Comprar/Asignar cartón a un jugador.
- [ ] **Jugar:** Entrar como ese jugador al Lobby -> Entrar al Bingo.
    - Verificar que el cartón se marca solo o permite marcar (según lógica actual).

---

## 💰 4. Panel de Control y Billetera

- [ ] **Recarga Simulada:** (Si aplica) Intentar recargar saldo desde botón recarga (o UI Admin).
- [x] **Red de Mercadeo:**
    - [x] Entrar a pestaña "Mi Red".
    - [x] Verificar que aparezca el link de referido propio.
    - [x] Verificar tabla de referidos (si hay datos). (Corregido bug de vinculación)

---

## ⚙️ 5. Mantenimiento

- [ ] **Limpieza de Datos:** (Ya ejecutada). Verificar que no aparezcan usuarios extraños en `SuperAdmin > Usuarios`.
