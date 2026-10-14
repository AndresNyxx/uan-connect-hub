# UAN Advisor Connect

Quiero construir desde cero una aplicación web llamada UAN Advisor Connect para la Universidad Antonio Nariño (UAN).

IMPORTANTE: antes de desarrollar las funcionalidades, conecta este proyecto de Lovable con MI PROYECTO REAL DE SUPABASE. No quiero utilizar Lovable Cloud como base de datos ni crear una base de datos nueva.

DATOS DE MI SUPABASE:

URL del proyecto:
https://vymgqbozudohwpsdzfjd.supabase.co

URL REST API:
https://vymgqbozudohwpsdzfjd.supabase.co/rest/v1/

Publishable key:
sb_publishable_GecI-T7rSyzbn1yGh4GSrQ_JfHXnrYG

Utiliza la integración oficial de Supabase de Lovable para conectar el proyecto. Si Lovable permite seleccionar directamente el proyecto de Supabase después de autorizar la conexión, utiliza ese proyecto.

NO crees otro proyecto de Supabase.
NO crees una base de datos nueva.
NO uses una base de datos interna de Lovable.
NO reemplaces mi Supabase real.
NO inventes tablas ni columnas sin revisar primero la estructura real.

==================================================

OBJETIVO DE LA PLATAFORMA
==================================================

La plataforma se llama:

UAN Advisor Connect

Su objetivo es permitir que estudiantes de la Universidad Antonio Nariño puedan solicitar y reservar asesorías.

El flujo principal será:

Estudiante
↓
Se identifica mediante su código personal
↓
El sistema encuentra sus datos
↓
Se muestra su nombre y correo institucional
↓
Selecciona el tipo de asesoría
↓
Consulta las fechas/franjas disponibles
↓
Selecciona una franja
↓
Confirma la reserva
↓
La reserva queda guardada en Supabase y asociada al estudiante correspondiente.

==================================================
2. NO HABRÁ INICIO DE SESIÓN

Esta decisión es MUY IMPORTANTE.

La plataforma NO tendrá:

Registro de usuarios.

Inicio de sesión tradicional.

Contraseñas.

Login con correo y contraseña.

Autenticación mediante contraseña para estudiantes.

Creación de cuentas de estudiantes.

El estudiante se identificará utilizando su código personal.

El código personal NO debe tratarse como una contraseña.

Debe utilizarse para buscar/identificar al estudiante dentro de la tabla de usuarios y posteriormente asociarlo a la reserva.

El estudiante debe poder ingresar su código personal y el sistema debe buscarlo en Supabase.

Cuando encuentre el estudiante, mostrar:

Nombre del estudiante.

Correo electrónico institucional.

Después podrá continuar con la reserva.

==================================================
3. CONEXIÓN Y REVISIÓN DE SUPABASE

Después de conectar Supabase, ANTES de implementar las funcionalidades, inspecciona la estructura REAL de mi base de datos.

Debes revisar las tablas existentes y sus relaciones.

Actualmente la base de datos está pensada para trabajar con:

usuarios

recursos

franjas

reservas

Pero NO asumas que las columnas tienen nombres específicos.

Primero inspecciona:

nombres reales de las tablas;

nombres reales de las columnas;

tipos de datos;

claves primarias;

claves foráneas;

relaciones entre tablas.

Utiliza exactamente los nombres y relaciones que existan en Supabase.

NO inventes columnas como:
usuario_id
recurso_id
franja_id
nombre
correo
codigo

si esos nombres no existen realmente.

Si las columnas tienen otros nombres, utiliza los nombres reales.

Tampoco modifiques la estructura de la base de datos sin necesidad.

==================================================
4. HU-01 - VISUALIZAR LOS TIPOS DE ASESORÍA DISPONIBLES

Historia de usuario:

Como estudiante de la UAN quiero visualizar los tipos de asesoría disponibles para seleccionar el servicio que necesito.

Criterios de aceptación:

Se debe mostrar:

Orientación Psicosocial.

Se debe mostrar:

Asesoría de Lectura y Redacción Académica.

El estudiante debe poder seleccionar una de las dos opciones.

Las opciones deben obtenerse desde los datos reales de Supabase, utilizando la tabla correspondiente.

No se deben crear datos falsos si los registros ya existen en Supabase.

Al seleccionar una asesoría, se debe conservar su ID REAL para utilizarlo posteriormente durante la reserva.

La interfaz debe ser clara, moderna y sencilla para estudiantes de la UAN.

==================================================
5. HU-02 - SELECCIONAR ESTUDIANTE

Historia de usuario:

Como estudiante de la UAN quiero seleccionar mi nombre de una lista.

Descripción:

El sistema debe permitir que el estudiante se reconozca a sí mismo y quede asociado a las reservas que realice.

Criterios de aceptación:

Debe existir una forma de buscar/identificar al estudiante mediante su código personal.

El sistema debe consultar la tabla real de usuarios de Supabase.

Al encontrar el estudiante, debe mostrar:

Nombre completo.

Correo electrónico institucional.

No se debe solicitar contraseña.

No se debe crear inicio de sesión.

El estudiante seleccionado debe conservar su ID REAL de Supabase.

Ese ID debe utilizarse para asociar posteriormente la reserva con el estudiante.

El sistema no debe crear un nuevo usuario cuando el estudiante ya existe en Supabase.

==================================================
6. FLUJO DE RESERVA

Después de identificar al estudiante:

PASO 1:
El estudiante ingresa su código personal.

PASO 2:
El sistema consulta Supabase y encuentra al estudiante.

PASO 3:
Se muestran sus datos:

Nombre completo
Correo institucional

PASO 4:
El estudiante selecciona el tipo de asesoría:

Orientación Psicosocial

Asesoría de Lectura y Redacción Académica

PASO 5:
El sistema consulta las franjas disponibles relacionadas con el recurso/asesoría seleccionado.

PASO 6:
El estudiante selecciona una fecha y una franja disponible.

PASO 7:
El estudiante confirma la reserva.

PASO 8:
La reserva se guarda en la tabla REAL de reservas de Supabase.

La reserva debe quedar correctamente relacionada con:

El estudiante.

El recurso/tipo de asesoría.

La franja seleccionada.

Utiliza los IDs y relaciones REALES existentes en Supabase.

==================================================
7. PREVENIR RESERVAS DUPLICADAS

Antes de confirmar una reserva, consulta Supabase para verificar que la franja todavía esté disponible.

Si otra reserva ya ocupa esa franja, no permitir crear una segunda reserva para el mismo espacio/horario.

Mostrar un mensaje claro indicando que la franja ya no está disponible y permitir seleccionar otra.

No asumir disponibilidad únicamente desde el frontend.

La comprobación final debe realizarse contra Supabase.

==================================================
8. INTERFAZ

Quiero una interfaz moderna, limpia y profesional, relacionada con una plataforma universitaria.

Nombre:

UAN Advisor Connect

La interfaz debe estar en español.

Debe ser sencilla de utilizar y especialmente clara para estudiantes.

No quiero una interfaz sobrecargada.

La navegación debe ser intuitiva.

La página principal debe explicar brevemente que la plataforma permite consultar y reservar asesorías.

Debe existir un flujo claro para:

Identificarse.

Seleccionar asesoría.

Seleccionar fecha/franja.

Confirmar reserva.

==================================================
9. MANEJO DE ESTADOS

Mostrar estados claros para:

Cargando estudiante.

Estudiante encontrado.

Código personal no encontrado.

Cargando asesorías.

No hay asesorías disponibles.

Cargando franjas.

No hay franjas disponibles.

Franja seleccionada.

Reserva en proceso.

Reserva realizada correctamente.

Error al realizar la reserva.

Franja que acaba de ser ocupada por otro estudiante.

Los mensajes deben ser sencillos y estar en español.

==================================================
10. SEGURIDAD

No expongas claves secretas ni service_role keys en el frontend.

Utiliza únicamente la conexión segura proporcionada por la integración de Supabase.

La publishable key puede utilizarse según el funcionamiento normal de Supabase, pero NO utilices una service_role key en el código del navegador.

Revisa también las políticas RLS existentes antes de implementar operaciones de lectura y escritura.

Si las políticas RLS impiden que la aplicación funcione correctamente, NO las desactives indiscriminadamente.

Indícame qué política es necesaria y por qué.

==================================================
11. NO INVENTAR DATOS

Este punto es fundamental.

No generes estudiantes ficticios.

No generes asesorías ficticias.

No generes franjas ficticias.

No generes reservas ficticias.

Toda la información debe provenir de mi Supabase real.

==================================================
12. ORDEN DE TRABAJO

Trabaja exactamente en este orden:

Conectar Lovable con mi Supabase real.

Confirmar que la conexión funciona.

Inspeccionar las tablas existentes.

Inspeccionar las columnas reales.

Inspeccionar las relaciones y claves foráneas.

Identificar cómo se relacionan usuarios, recursos, franjas y reservas.

Implementar HU-02.

Implementar HU-01.

Implementar el flujo de selección de fecha y franja.

Implementar la creación de reservas.

Implementar la validación de disponibilidad antes de crear una reserva.

Probar que los datos realmente se leen y escriben en Supabase.

No crear tablas nuevas si las existentes ya permiten implementar el flujo.

Antes de hacer cambios estructurales en Supabase, explícame qué cambio sería necesario y por qué.

==================================================
13. RESULTADO ESPERADO

Quiero terminar con una aplicación funcional donde:

Lovable esté conectado a mi Supabase REAL.

Los estudiantes existentes se consulten desde Supabase.

El estudiante pueda identificarse mediante su código personal.

Se muestre su nombre y correo institucional.

Pueda seleccionar Orientación Psicosocial.

Pueda seleccionar Asesoría de Lectura y Redacción Académica.

Pueda consultar las franjas disponibles.

Pueda seleccionar una fecha/franja.

Pueda crear una reserva.

La reserva quede asociada al estudiante correcto.

La reserva quede asociada a la asesoría correcta.

La reserva quede asociada a la franja correcta.

Todo quede almacenado realmente en Supabase.

IMPORTANTE:

No quiero que simplemente simules la conexión.

Quiero que la aplicación utilice realmente mi proyecto de Supabase:

https://vymgqbozudohwpsdzfjd.supabase.co

Primero conecta e inspecciona la base de datos real y después implementa las funcionalidades utilizando sus columnas y relaciones reales.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://uan-connect-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6bc7f6c5-ab57-48ab-95df-2c96d8a4be79).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
