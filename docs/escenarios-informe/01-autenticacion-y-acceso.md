# Escenario 01: Autenticacion Y Acceso Segun Permisos

## Objetivo

Validar que un usuario puede iniciar sesion correctamente y que el sistema solo muestra o habilita los modulos permitidos para su rol.

## Proceso evaluado

- Inicio de sesion en el modulo `Auth`
- Redireccion al `Dashboard`
- Acceso condicionado a modulos segun permisos del usuario

## Precondiciones

- Existe un usuario activo con credenciales validas.
- El usuario tiene un rol configurado en el sistema.
- El proyecto web se encuentra desplegado o ejecutandose en entorno de pruebas.

## Datos de prueba

- Correo del usuario: `[completar]`
- Rol del usuario: `[admin / collector / super_collector / otro]`
- Modulos esperados para el rol: `[completar]`

## Pasos

1. Ingresar a la pantalla de inicio de sesion.
2. Registrar correo y contrasena validos.
3. Hacer clic en el boton de ingreso.
4. Verificar que el sistema redirige al panel principal.
5. Revisar el menu lateral disponible para el usuario autenticado.
6. Intentar acceder a un modulo permitido.
7. Intentar acceder a un modulo no permitido, si aplica.

## Resultado esperado

- El sistema permite el inicio de sesion con credenciales validas.
- El usuario es redirigido al `Dashboard`.
- El menu lateral muestra solo opciones acordes al rol.
- Los modulos restringidos no deben mostrarse o no deben permitir el acceso.

## Resultado obtenido

[Completar con lo observado en la prueba]

## Evidencia

- Captura de la pantalla de inicio de sesion.
- Captura del `Dashboard` luego del acceso.
- Captura del menu lateral visible para el rol evaluado.
- Captura del comportamiento al intentar acceder a un modulo restringido.

## Conclusion

`Conforme / No conforme`
