/* ── Entidades del schema real ───────────────────────────── */

export interface Perfil {
  idPerfil:        number;
  nombreCompleto:  string;
  apellidos:       string;
  correo:          string;
  curp:            string | null;
  matricula:       string | null;
  numeroTelefono:  number | null;
  fechaRegistro:   number;   // Unix timestamp
  fechaExpiracion: number;   // Unix timestamp
  plantel:         string | null;
}

export interface Rol {
  idRol:       number;
  nombre:      string;
  descripcion: string;
  estatus:     number;
}

export interface Curso {
  idCurso:      number;
  nombre:       string;
  codigoCurso:  string;
  portada:      string | null;
  cantidadEjes: number;
  estatus:      number;
}

export interface RutaAprendizaje {
  idRuta:      number;
  idCurso:     number;
  nombre:      string;
  descripcion: string;
  lecciones:   number[];  // JSON array de idLeccion
  estatus:     number;
}

export interface Usuario {
  idUsuario:  number;
  idPerfil:   number;
  idRol:      number;
  idRuta:     number;
  estatus:    number;
  esConvenio: number;
}

export interface Credencial {
  idCredencial:      number;
  idUsuario:         number;
  estatusCredencial: number;
  nombreUsuario:     string;
  contrasenia:       string;  // bcrypt hash
}

export interface Eje {
  idEje:             number;
  idCurso:           number;
  codigoEje:         string;
  nombre:            string;
  descripcion:       string;
  estatus:           number;
  cantidadSecciones: number;
}

export interface Seccion {
  idSeccion:         number;
  idEje:             number;
  nombre:            string;
  codigoSeccion:     string;
  nivel:             number;
  estatus:           number;
  cantidadLecciones: number;
}

export interface Leccion {
  idLeccion:      number;
  idSeccion:      number;
  nombre:         string;
  codigoLeccion:  string;
}

export interface OpcionPregunta {
  id:    string;   // "a", "b", "c", "d"
  texto: string;
}

export interface Pregunta {
  idPregunta:         number;
  idSeccion:          number;
  idLeccion:          number;
  pregunta:           string;
  imagenPregunta:     string | null;
  tipoPregunta:       string;
  opcionesRespuesta:  OpcionPregunta[];  // JSON parseado
  respuestaCorrecta:  string;            // NUNCA se envía al frontend
  fechaRegistro:      number;
  estatus:            number;
}

/* ── Payload JWT ─────────────────────────────────────────── */
export interface JwtPayload {
  sub:          number;   // idUsuario
  correo:       string;
  nombreUsuario:string;
  rol:          string;
  iat?:         number;
  exp?:         number;
}

/* ── Extender Request de Express ─────────────────────────── */
declare global {
  namespace Express {
    interface Request {
      usuario?: JwtPayload;
    }
  }
}