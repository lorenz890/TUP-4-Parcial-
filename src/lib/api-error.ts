import { ZodError } from "zod";

// Códigos de la sección 11.8. Tipados para que un error de tipeo no compile.
export type CodigoError =
  | "JSON_INVALIDO"
  | "NO_AUTENTICADO"
  | "CREDENCIALES_INVALIDAS"
  | "SIN_PERMISO"
  | "NO_ENCONTRADO"
  | "CODIGO_DUPLICADO"
  | "DOCUMENTO_DUPLICADO"
  | "EMAIL_DUPLICADO"
  | "NOMBRE_DUPLICADO"
  | "CATEGORIA_EN_USO"
  | "STOCK_INSUFICIENTE"
  | "FACTURA_ANULADA"
  | "VALIDACION"
  | "PRODUCTO_INACTIVO"
  | "CUENTA_CORRIENTE_NO_HABILITADA"
  | "LIMITE_CREDITO_EXCEDIDO"
  | "MONTO_INSUFICIENTE"
  | "PAGO_SUPERA_DEUDA"
  | "SALDO_PENDIENTE"
  | "CONTRASENA_ACTUAL_INCORRECTA"
  | "OPERACION_SOBRE_SI_MISMO"
  | "ERROR_INTERNO";

// La única clase de error del sistema (sección 10.4). Los servicios la lanzan;
// las rutas y las acciones la convierten en respuesta.
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: CodigoError,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// Convierte cualquier cosa que se haya lanzado en un ApiError. Lo usan los dos
// envoltorios (rutas y acciones) para que el formato de error sea siempre el mismo.
export function aApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  // Los servicios validan con zod y dejan que el error suba hasta acá.
  if (error instanceof ZodError) {
    const details = error.issues.map((problema) => ({
      campo: problema.path.join("."),
      mensaje: problema.message,
    }));
    return new ApiError(422, "VALIDACION", "Hay campos con errores.", details);
  }

  // Error inesperado: el detalle va al log y nunca al cliente (sección 10.4).
  console.error(error);
  return new ApiError(500, "ERROR_INTERNO", "Ocurrió un error inesperado.");
}
