# Cancelación de reservas

- [x] Revisar consultas, tablas, relaciones y limitaciones de acceso existentes.
- [x] Añadir «Mis reservas» con la cita vigente y confirmación de cancelación.
- [x] Validar asociación al estudiante y leer estado cancelada antes de liberar el cupo.
- [x] Actualizar disponibilidad y permitir otra reserva sin volver a seleccionar estudiante.
- [x] Probar 16 reglas aisladas, confirmación con cita real y éxito/error simulados sin modificar datos reales.
- [x] Preparar operación SQL limitada: supabase/cancelar_reserva.sql, sin nuevas tablas ni UPDATE general.
- [ ] Activar la operación de cancelación en el Supabase real y verificar allí el flujo completo. Bloqueo: solo hay clave publicable; el propietario debe ejecutar el SQL y habilitar una cita autorizada de prueba.