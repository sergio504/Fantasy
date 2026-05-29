# Proyecto: Comunio Fútbol Divisiones Bajas

## Descripción
Aplicación web estilo Comunio para divisiones de fútbol no profesionales.
Los usuarios crean o se unen a ligas, fichan jugadores reales de esa división
y compiten por puntuaciones basadas en el rendimiento real de los jugadores.

## Stack
- Backend: Node.js
- ORM: Prisma
- Base de datos: PostgreSQL
- Frontend: Web (mismo repositorio)

## Estado actual
Proyecto iniciado. Revisar la estructura existente antes de tocar nada.
Si hay algo relacionado con lo que se pide, adáptarlo en lugar de reemplazarlo.

## Fases del proyecto
- **Fase 1 (ACTUAL):** Usuarios, ligas y mercado básico
- **Fase 2 (PENDIENTE):** Jugadores reales, puntuaciones y partidos
- **Fase 3 (PENDIENTE):** Por definir

⚠️ NO implementar puntuaciones, partidos ni gestión automática de jugadores
hasta que se indique explícitamente.

---

## Fase 1 - Especificaciones

### Usuarios
- Registro con email y contraseña (contraseña hasheada)
- Login con JWT
- Un usuario puede crear y/o unirse a múltiples ligas

### Ligas
Cada liga tiene:
- Nombre
- Tipo: pública o privada
  - Si es privada: código único de invitación generado al crearla
- División real asociada (hay 3 divisiones: A, B y C)
  - Solo puntúan jugadores de esa división en esa liga
- Presupuesto inicial configurable
- Número máximo de equipos configurable
- Clasificación propia
- Mercado propio

Un usuario puede:
- Crear una o más ligas (queda como administrador)
- Unirse a una liga pública (si no está llena)
- Unirse a una liga privada con el código de invitación

### Mercado
- Cada liga tiene su propio mercado
- El sistema puede poner jugadores a la venta
- Los usuarios pueden poner jugadores de su equipo a la venta
- Al poner en venta hay que indicar un precio mínimo
- Las compras se descuentan del presupuesto del equipo

---

## Instrucciones generales
- Buenas prácticas siempre: validación de inputs y manejo de errores
- Antes de implementar cualquier cosa, proponer primero el schema de Prisma
  y esperar confirmación
- Preguntar si hay dudas antes de tomar decisiones importantes de arquitectura