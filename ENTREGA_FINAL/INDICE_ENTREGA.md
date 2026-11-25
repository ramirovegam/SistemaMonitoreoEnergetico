# INDICE DE ENTREGA HYPERDATASYNTHETIC

Paquete preparado el 25 de noviembre de 2026. Auditoria vigente: 29 SI y 0 NO. Copia final versionada en la rama `final` de SIMET, dentro de `ENTREGA_FINAL`. Unico pendiente: captura de la autocalificacion individual de 6.2.

## 1. Auditoria

1. `00_AUDITORIA\AUDITORIA_RUBRICA.xlsx`. Rubrica con 29 SI y 0 NO.
2. `00_AUDITORIA\PENDIENTES.md`. Estado de cierre y observaciones.
3. `00_AUDITORIA\REVISION_PPTX_ULTIMA_VERSION.md`. Revision de la presentacion oficial.

## 2. Documentacion

1. `01_Documentacion\Acta de Inicio (Project Charter) - HyperDataSynthetic - v3.0 Word.docx` y su PDF.
2. `01_Documentacion\Entregable_2.1_2.4_Funcionalidad.docx` y su PDF. Cumplimiento actualizado.
3. `01_Documentacion\Entregable_3.4_3.5_Volumen_y_datamart.docx` y su PDF.
4. `01_Documentacion\Documentacion_Tecnica_SIMET.docx` y su PDF. Memoria tecnica.
5. `01_Documentacion\Manual_Usuario_SIMET.docx` y su PDF. Manual con indice.
6. `01_Documentacion\Guia_Uso_SIMET.docx` y su PDF.
7. `01_Documentacion\Propuesta_BI_Reunion_20Nov2026.docx` y su PDF. Cifras verificadas.
8. `01_Documentacion\Entregable_6.1_6.2_Trabajo_en_grupo_y_soft_skills.docx` y su PDF.
9. `01_Documentacion\Autocalificacion_6.2_Unico_23_Hojas.xlsx`. Libro unico con 24 hojas y promedios protegidos.

## 3. Presentacion

1. `02_Presentacion\Sistema_de_Monitoreo_Consumo_Energetico.pptx`. Respaldo intacto de la presentacion, 46 diapositivas. La version de defensa es la copia corregida de Canva `DAHb7o_LRYc`, con paginas 39, 44 y 46 actualizadas. Queda pendiente la pagina 37, a cargo del equipo de Power BI.
2. `02_Presentacion\Redaccion_HSD_Word.docx` y su PDF. Cifras verificadas.
3. `02_Presentacion\HSD_Deck_Segunda_Entrega.html`. Material de apoyo.
4. `02_Presentacion\Guion_Segunda_Entrega_HSD.md`. Guion de apoyo con 15 diapositivas asignadas por nombre.

## 4. Datos y evidencia

1. `03_Datos_y_Evidencia\00_conteos_tablas.csv`. Conteos verificados.
2. `03_Datos_y_Evidencia\resultados_corrida_10M.csv`. Corrida con semilla 20260103.
3. CSV del datamart de consumo, eventos, alertas y saldo por servicio.

## 5. Insumo BI

1. `04_Insumo_BI_PowerBI\BaseDatos crudo en BI.pbix.zip`.
2. `04_Insumo_BI_PowerBI\Reporte_BI_HSD.docx` y su PDF. Reporte terminado con marcadores de imagen.

## 6. Codigo

1. Codigo fuente de SIMET en la raiz del repositorio, sin `.env` y sin dependencias instaladas.
2. `GENERADOR_HSD`. Copia limpia del data engine, sin `.env`, sin entorno virtual y sin historial Git.
3. `GENERADOR_HSD\bi\README_BI.md`. Resumen de explotacion analitica.

## 7. Cifras vigentes

1. Lecturas: 10,800,000.
2. Servicios: 5,000.
3. Medidores: 5,260.
4. Fechas: 90.
5. Eventos: 15,839.
6. Alertas: 15,682.
7. Consumo real: 39,987,301.57 kWh.
8. Semilla: 20260103.

## 8. Archivos historicos

1. `02_Presentacion\HALLAZGOS_DATA_ENGINE_260926.md`. Analisis de septiembre de 2026 con la semilla anterior. No se usa para la defensa.
2. `03_Datos_y_Evidencia\resultados_corrida_10M_viejo.csv`. Resultado de la corrida anterior con semilla 20260101. No se usa para la defensa.
3. Los archivos `.bak_*` y los respaldos de base de datos quedan fuera del repositorio. Conservan su copia local en el paquete de escritorio.
