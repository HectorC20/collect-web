# Escenario 03: Gestion De Cartera, Registro De Acciones Y Reportes

## Objetivo

Validar que el usuario puede consultar una cartera, aplicar filtros, registrar una accion sobre un cliente y exportar un reporte como evidencia del proceso.

## Proceso evaluado

- Acceso al modulo `Cartera`
- Consulta de clientes asignados
- Filtro por busqueda, manzana, lote o estado
- Registro de accion sobre cliente
- Exportacion de reporte

## Precondiciones

- El usuario ha iniciado sesion correctamente.
- El usuario tiene permisos para visualizar cartera y reportes.
- Existe al menos una cartera importada y asignada.
- Existe al menos un cliente disponible para gestion.

## Datos de prueba

- Usuario evaluado: `[completar]`
- Cliente seleccionado: `[completar]`
- Filtro aplicado: `[completar]`
- Tipo de accion registrada: `[completar]`
- Reporte exportado: `[general / cartera / actividad]`

## Pasos

1. Ingresar al modulo `Cartera`.
2. Verificar que el sistema muestra la cartera propia o la cartera seleccionada, segun el rol.
3. Aplicar un filtro de busqueda por nombre, DNI, manzana, lote o estado.
4. Seleccionar un cliente de la lista resultante.
5. Registrar una accion con observacion y fecha, si corresponde.
6. Confirmar que la accion aparece en el historial del cliente.
7. Ingresar al modulo `Reportes`.
8. Exportar uno de los reportes disponibles.
9. Confirmar que se descarga el archivo y que contiene informacion del proceso evaluado.

## Resultado esperado

- La cartera se carga correctamente.
- Los filtros reducen la lista segun el criterio aplicado.
- El detalle del cliente queda accesible.
- La accion se registra correctamente y se refleja en el historial.
- El sistema permite exportar el reporte y descargar el archivo.

## Criterio de validacion adicional

- El sistema no debe permitir registrar una accion duplicada para el mismo cliente si la regla de negocio lo restringe.
- Si no hay datos disponibles, el sistema debe mostrar un estado vacio controlado.

## Resultado obtenido

[Completar con lo observado en la prueba]

## Evidencia

- Captura de la cartera cargada.
- Captura del filtro aplicado.
- Captura del formulario o confirmacion de la accion registrada.
- Captura del historial actualizado.
- Archivo exportado o captura del mensaje de exportacion exitosa.

## Conclusion

`Conforme / No conforme`
