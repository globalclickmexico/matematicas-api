-- ============================================================
-- CursoMATE — Schema MySQL
-- Adaptado al modelo de datos real del proyecto
--
-- Ejecutar:
--   mysql -u root -p < sql/schema.sql
-- ============================================================

DROP DATABASE IF EXISTS `clickplus_regularizacion_matematicas`;

CREATE DATABASE IF NOT EXISTS `clickplus_matematicas`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `clickplus_matematicas`;

-- ── Perfiles (datos personales) ───────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`perfiles` (
  `idPerfil`        INT          NOT NULL AUTO_INCREMENT,
  `nombreCompleto`  VARCHAR(100) NULL,
  `apellidos`       VARCHAR(120) NULL,
  `correo`          VARCHAR(120) NULL,
  `curp`            VARCHAR(18)  NULL,
  `matricula`       VARCHAR(45)  NULL,
  `numeroTelefono`  VARCHAR(15)  NULL,
  `fechaRegistro`   INT(11)      NULL,
  `fechaExpiracion` INT(11)      NULL,
  `plantel`         VARCHAR(100) NULL,
  PRIMARY KEY (`idPerfil`),
  UNIQUE KEY `uq_correo`    (`correo`),
  UNIQUE KEY `uq_matricula` (`matricula`)
) ENGINE=InnoDB;

-- ── Roles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`roles` (
  `idRol`       INT          NOT NULL AUTO_INCREMENT,
  `nombre`      VARCHAR(45)  NULL,
  `descripcion` VARCHAR(100) NULL,
  `estatus`     TINYINT      NULL DEFAULT 1,
  PRIMARY KEY (`idRol`)
) ENGINE=InnoDB;

-- ── Cursos ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`cursos` (
  `idCurso`      INT          NOT NULL AUTO_INCREMENT,
  `nombre`       VARCHAR(45)  NULL,
  `codigoCurso`  VARCHAR(10)  NULL,
  `portada`      VARCHAR(120) NULL,
  `cantidadEjes` INT          NULL,
  `estatus`      TINYINT      NULL DEFAULT 1,
  PRIMARY KEY (`idCurso`),
  UNIQUE KEY `uq_codigo_curso` (`codigoCurso`)
) ENGINE=InnoDB;

-- ── Rutas de aprendizaje ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`rutas_aprendizaje` (
  `idRuta`      INT          NOT NULL AUTO_INCREMENT,
  `idCurso`     INT          NOT NULL,
  `nombre`      VARCHAR(200) NULL,
  `descripcion` VARCHAR(120) NULL,
  `lecciones`   JSON         NULL,
  `estatus`     TINYINT      NULL DEFAULT 1,
  PRIMARY KEY (`idRuta`),
  INDEX `fk_curso_ruta_aprendizaje_idx` (`idCurso` ASC),
  CONSTRAINT `fk_curso_ruta_aprendizaje`
    FOREIGN KEY (`idCurso`) REFERENCES `clickplus_matematicas`.`cursos` (`idCurso`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Usuarios ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`usuarios` (
  `idUsuario`  INT     NOT NULL AUTO_INCREMENT,
  `idPerfil`   INT     NOT NULL,
  `idRol`      INT     NOT NULL,
  `idRuta`     INT     NOT NULL,
  `estatus`    TINYINT NULL DEFAULT 1,
  `esConvenio` TINYINT NULL DEFAULT 0,
  PRIMARY KEY (`idUsuario`),
  INDEX `fk_perfil_usuario_idx` (`idPerfil` ASC),
  INDEX `fk_rol_usuario_idx`    (`idRol`    ASC),
  INDEX `fk_ruta_usuario_idx`   (`idRuta`   ASC),
  CONSTRAINT `fk_perfil_usuario`
    FOREIGN KEY (`idPerfil`) REFERENCES `clickplus_matematicas`.`perfiles` (`idPerfil`)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_rol_usuario`
    FOREIGN KEY (`idRol`) REFERENCES `clickplus_matematicas`.`roles` (`idRol`)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_ruta_usuario`
    FOREIGN KEY (`idRuta`) REFERENCES `clickplus_matematicas`.`rutas_aprendizaje` (`idRuta`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Credenciales ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`credenciales` (
  `idCredencial`      INT          NOT NULL AUTO_INCREMENT,
  `idUsuario`         INT          NOT NULL,
  `estatusCredencial` TINYINT      NULL DEFAULT 1,
  `nombreUsuario`     VARCHAR(45)  NULL,
  `contrasenia`       VARCHAR(200) NULL,
  PRIMARY KEY (`idCredencial`),
  UNIQUE KEY `uq_nombre_usuario` (`nombreUsuario`),
  INDEX `fk_credencial_usuario_idx` (`idUsuario` ASC),
  CONSTRAINT `fk_credencial_usuario`
    FOREIGN KEY (`idUsuario`) REFERENCES `clickplus_matematicas`.`usuarios` (`idUsuario`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Ejes temáticos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`ejes` (
  `idEje`             INT          NOT NULL AUTO_INCREMENT,
  `idCurso`           INT          NOT NULL,
  `codigoEje`         VARCHAR(10)  NULL,
  `nombre`            VARCHAR(100) NULL,
  `descripcion`       VARCHAR(100) NULL,
  `estatus`           TINYINT      NULL DEFAULT 1,
  `cantidadSecciones` INT          NULL,
  PRIMARY KEY (`idEje`),
  INDEX `flk_curso_eje_idx` (`idCurso` ASC),
  CONSTRAINT `flk_curso_eje`
    FOREIGN KEY (`idCurso`) REFERENCES `clickplus_matematicas`.`cursos` (`idCurso`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Secciones ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`secciones` (
  `idSeccion`         INT         NOT NULL AUTO_INCREMENT,
  `idEje`             INT         NOT NULL,
  `nombre`            VARCHAR(45) NULL,
  `codigoSeccion`     VARCHAR(10) NULL,
  `nivel`             INT         NULL,
  `estatus`           TINYINT     NULL DEFAULT 1,
  `cantidadLecciones` INT         NULL,
  PRIMARY KEY (`idSeccion`),
  INDEX `fk_eje_seccion_idx` (`idEje` ASC),
  CONSTRAINT `fk_eje_seccion`
    FOREIGN KEY (`idEje`) REFERENCES `clickplus_matematicas`.`ejes` (`idEje`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Lecciones ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`lecciones` (
  `idLeccion`     INT          NOT NULL AUTO_INCREMENT,
  `idSeccion`     INT          NOT NULL,
  `nombre`        VARCHAR(200) NULL,
  `codigoLeccion` VARCHAR(10)  NULL,
  PRIMARY KEY (`idLeccion`),
  INDEX `fk_seccion_leccion_idx` (`idSeccion` ASC),
  CONSTRAINT `fk_seccion_leccion`
    FOREIGN KEY (`idSeccion`) REFERENCES `clickplus_matematicas`.`secciones` (`idSeccion`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Insignias ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`insignias` (
  `idInsignia`  INT          NOT NULL AUTO_INCREMENT,
  `nombre`      VARCHAR(45)  NULL,
  `descripcion` VARCHAR(100) NULL,
  `idSeccion`   INT          NOT NULL,
  `valor`       VARCHAR(25)  NULL,
  PRIMARY KEY (`idInsignia`)
) ENGINE=InnoDB;

-- ── Preguntas ─────────────────────────────────────────────────
-- opcionesRespuesta JSON: [{"id":"a","texto":"..."},{"id":"b","texto":"..."},...]
-- respuestaCorrecta: id de la opción correcta, ej: "b"
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`preguntas` (
  `idPregunta`        INT          NOT NULL AUTO_INCREMENT,
  `idSeccion`         INT          NOT NULL,
  `idLeccion`         INT          NOT NULL,
  `pregunta`          VARCHAR(150) NULL,
  `imagenPregunta`    VARCHAR(120) NULL,
  `tipoPregunta`      VARCHAR(45)  NULL,
  `opcionesRespuesta` JSON         NULL,
  `respuestaCorrecta` VARCHAR(120) NULL,
  `fechaRegistro`     INT(11)      NULL,
  `estatus`           TINYINT      NULL DEFAULT 1,
  PRIMARY KEY (`idPregunta`),
  INDEX `fk_seccion_pregunta_idx` (`idSeccion` ASC),
  INDEX `fk_leccion_pregunta_idx` (`idLeccion` ASC),
  CONSTRAINT `fk_seccion_pregunta`
    FOREIGN KEY (`idSeccion`) REFERENCES `clickplus_matematicas`.`secciones` (`idSeccion`)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_leccion_pregunta`
    FOREIGN KEY (`idLeccion`) REFERENCES `clickplus_matematicas`.`lecciones` (`idLeccion`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Lecciones vistas ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`lecciones_vistas` (
  `idCurso`          INT     NOT NULL,
  `idLeccion`        INT     NOT NULL,
  `idUsuario`        INT     NOT NULL,
  `fechaRealizacion` INT(11) NULL,
  INDEX `fk_curso_leccion_vista_idx`   (`idCurso`   ASC),
  INDEX `fk_leccion_leccion_vista_idx` (`idLeccion` ASC),
  INDEX `fk_usuario_leccion_vista_idx` (`idUsuario` ASC),
  CONSTRAINT `fk_curso_leccion_vista`
    FOREIGN KEY (`idCurso`)   REFERENCES `clickplus_matematicas`.`cursos`    (`idCurso`)   ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_leccion_leccion_vista`
    FOREIGN KEY (`idLeccion`) REFERENCES `clickplus_matematicas`.`lecciones` (`idLeccion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_usuario_leccion_vista`
    FOREIGN KEY (`idUsuario`) REFERENCES `clickplus_matematicas`.`usuarios`  (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Evaluaciones por sección ──────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`evaluaciones_seccion` (
  `idCurso`          INT     NOT NULL,
  `idEje`            INT     NOT NULL,
  `idSeccion`        INT     NOT NULL,
  `idUsuario`        INT     NOT NULL,
  `calificacion`     INT     NULL,
  `fechaRealizacion` INT(11) NULL,
  INDEX `fk_curso_evaluaciones_idx`   (`idCurso`   ASC),
  INDEX `fk_eje_evaluaciones_idx`     (`idEje`     ASC),
  INDEX `fk_seccion_evaluaciones_idx` (`idSeccion` ASC),
  INDEX `fk_usuario_evaluaciones_idx` (`idUsuario` ASC),
  CONSTRAINT `fk_curso_evaluaciones`
    FOREIGN KEY (`idCurso`)   REFERENCES `clickplus_matematicas`.`cursos`   (`idCurso`)   ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_eje_evaluaciones`
    FOREIGN KEY (`idEje`)     REFERENCES `clickplus_matematicas`.`ejes`      (`idEje`)     ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_seccion_evaluaciones`
    FOREIGN KEY (`idSeccion`) REFERENCES `clickplus_matematicas`.`secciones` (`idSeccion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_usuario_evaluaciones`
    FOREIGN KEY (`idUsuario`) REFERENCES `clickplus_matematicas`.`usuarios`  (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Evaluaciones por lección ──────────────────────────────────
-- NOTA: no incluye idUsuario según el schema original
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`evaluaciones_leccion` (
  `idSeccion`        INT     NOT NULL,
  `idLeccion`        INT     NOT NULL,
  `calificacion`     INT     NULL,
  `fechaRealizacion` INT(11) NULL,
  INDEX `fk_seccion_evaluaciones_leccion_idx` (`idSeccion` ASC),
  INDEX `fk_leccion_evaluaciones_leccion_idx` (`idLeccion` ASC),
  CONSTRAINT `fk_seccion_evaluaciones_leccion`
    FOREIGN KEY (`idSeccion`) REFERENCES `clickplus_matematicas`.`secciones` (`idSeccion`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_leccion_evaluaciones_leccion`
    FOREIGN KEY (`idLeccion`) REFERENCES `clickplus_matematicas`.`lecciones` (`idLeccion`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Secciones realizadas ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`secciones_realizadas` (
  `idUsuario`      INT     NOT NULL,
  `idSeccion`      INT     NOT NULL,
  `fechaRealizado` INT(11) NULL,
  `idCurso`        INT     NOT NULL,
  INDEX `fk_usuario_seccion_realizada_idx` (`idUsuario` ASC),
  INDEX `fk_seccion_seccion_realizada_idx` (`idSeccion` ASC),
  CONSTRAINT `fk_usuario_seccion_realizada`
    FOREIGN KEY (`idUsuario`) REFERENCES `clickplus_matematicas`.`usuarios`  (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_seccion_seccion_realizada`
    FOREIGN KEY (`idSeccion`) REFERENCES `clickplus_matematicas`.`secciones` (`idSeccion`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Ejes finalizados ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`ejes_finalizados` (
  `idEje`          INT     NOT NULL,
  `idUsuario`      INT     NOT NULL,
  `fechaRealizado` INT(11) NULL,
  `promedio`       INT     NULL,
  INDEX `fk_eje_eje_finalizado_idx`     (`idEje`     ASC),
  INDEX `fk_usuario_eje_finalizado_idx` (`idUsuario` ASC),
  CONSTRAINT `fk_eje_eje_finalizado`
    FOREIGN KEY (`idEje`)     REFERENCES `clickplus_matematicas`.`ejes`     (`idEje`)     ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_usuario_eje_finalizado`
    FOREIGN KEY (`idUsuario`) REFERENCES `clickplus_matematicas`.`usuarios` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Cursos finalizados ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`cursos_finalizados` (
  `idCurso`        INT     NOT NULL,
  `idUsuario`      INT     NOT NULL,
  `fechaRealizada` INT(11) NULL,
  `promedio`       INT     NULL,
  INDEX `fk_curso_curso_finalizado_idx`   (`idCurso`   ASC),
  INDEX `fk_usuario_curso_finalizado_idx` (`idUsuario` ASC),
  CONSTRAINT `fk_curso_curso_finalizado`
    FOREIGN KEY (`idCurso`)   REFERENCES `clickplus_matematicas`.`cursos`   (`idCurso`)   ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_usuario_curso_finalizado`
    FOREIGN KEY (`idUsuario`) REFERENCES `clickplus_matematicas`.`usuarios` (`idUsuario`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

-- ── Insignias obtenidas ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `clickplus_matematicas`.`insignias_obtenidas` (
  `idInsignia`    INT     NOT NULL,
  `idUsuario`     INT     NOT NULL,
  `fechaObtenida` INT(11) NULL,
  INDEX `fk_insignia_insignia_obtenida_idx` (`idInsignia` ASC),
  INDEX `fk_usuario_insignia_obtenida_idx`  (`idUsuario`  ASC),
  CONSTRAINT `fk_insignia_insignia_obtenida`
    FOREIGN KEY (`idInsignia`) REFERENCES `clickplus_matematicas`.`insignias` (`idInsignia`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_usuario_insignia_obtenida`
    FOREIGN KEY (`idUsuario`)  REFERENCES `clickplus_matematicas`.`usuarios`  (`idUsuario`)  ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;