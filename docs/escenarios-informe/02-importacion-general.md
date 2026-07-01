# Escenario 02: Vista Previa E Importacion De Data General

## Objetivo

Validar que el sistema permite seleccionar un archivo Excel de data general, generar una vista previa de cambios y ejecutar la importacion mostrando el resumen del proceso.

## Proceso evaluado

- Acceso al modulo `Importaciones > Data`
- Seleccion de archivo Excel
- Generacion de vista previa
- Importacion de registros
- Visualizacion del historial de importaciones

## Precondiciones

- El usuario cuenta con permisos para gestionar importaciones generales.
- Existe al menos un tramo activo en el sistema.
- Se dispone de un archivo Excel valido para importacion general.

## Datos de prueba

- Archivo Excel: `[completar nombre del archivo]`
- Cantidad estimada de registros: `[completar]`
- Fecha de prueba: `[completar]`

## Pasos

1. Ingresar al modulo `Importaciones`.
2. Acceder a la opcion `Data`.
3. Seleccionar el archivo Excel de prueba.
4. Ejecutar la opcion de vista previa.
5. Revisar el resumen mostrado por el sistema.
6. Confirmar que se visualizan registros nuevos, modificados, sin cambios o con error, segun corresponda.
7. Ejecutar la importacion.
8. Verificar el mensaje final del sistema.
9. Revisar el historial de importaciones generado en pantalla.

## Resultado esperado

- El sistema acepta el archivo seleccionado.
- La vista previa muestra un resumen con total de registros procesados.
- Se identifican registros nuevos, modificados, sin cambios y errores, si existen.
- La importacion finaliza mostrando un mensaje con nuevos, actualizados y errores.
- El historial de importaciones queda visible para consulta.

## Criterio de validacion adicional

- Si no existen tramos activos, el sistema debe impedir la vista previa o importacion y mostrar un mensaje de validacion.
- Si no se selecciona archivo, el sistema no debe continuar el proceso.

## Resultado obtenido

[Completar con lo observado en la prueba]

## Evidencia

- Captura de la seleccion del archivo.
- Captura de la vista previa.
- Captura del mensaje final de importacion.
- Captura del historial de importaciones.

## Conclusion

`Conforme / No conforme`
