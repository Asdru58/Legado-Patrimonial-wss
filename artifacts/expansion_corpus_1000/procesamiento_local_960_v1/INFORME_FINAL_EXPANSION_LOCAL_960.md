# Informe final - expansion local del corpus a aproximadamente 1.000 conferencias

CONFERENCIAS OBJETIVO: **960**

CONFERENCIAS PROCESADAS: **960**

CONFERENCIAS EXCLUIDAS:
Ninguna

PASAJES GENERADOS: **41921**

PROMEDIO PASAJES/CONFERENCIA: **43.668**

EMBEDDINGS GENERADOS: **41921**

SHAPE: **[41921, 1024]**
DTYPE: **float32**
DIMENSION: **1024**
NaN: **0**
Inf: **0**
NORMA VECTORIAL: **PASS**
CORRESPONDENCIA PASAJE <-> EMBEDDING: **PASS**

BGE-M3 PASAJES/MINUTO REAL: **70.899**
TIEMPO TOTAL BGE-M3: **35476.596 segundos**
CHECKPOINTS CREADOS: **420**
REANUDACION PROBADA: **PASS**

CORPUS LOCAL DISPONIBLE: **40 + 960 = 1000 conferencias**

PRUEBA SEMANTICA LOCAL: **PASS**

## Rutas

- Manifiesto final de pasajes: `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\MANIFIESTO_PASAJES_960.csv`
- Manifiesto de conferencias: `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\MANIFIESTO_CONFERENCIAS_PROCESADAS_960.csv`
- Textos brutos: `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\textos_brutos`
- Textos normalizados: `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\textos_normalizados`
- Pasajes: `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\PASAJES_960.jsonl`
- Embeddings: `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\embeddings_bge_m3_960.npy`
- Mapa pasaje <-> embedding: `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\MAPA_PASAJE_EMBEDDING_960.csv`
- Checkpoints: `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\checkpoints`
- Informe JSON: `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\INFORME_FINAL_EXPANSION_LOCAL_960.json`

## SHA-256

- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\MANIFIESTO_PASAJES_960.csv`: `976F44753A8E51F20342D918B91C66252106E99C514D08C1C1DB62CA713FE8BE`
- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\MANIFIESTO_CONFERENCIAS_PROCESADAS_960.csv`: `6885AAD6921E9EC29FEB7EB9D7EDFC80B8AEF0BE0DE623D3A7A1135F14A0A563`
- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\PASAJES_960.jsonl`: `2C412B5EF49C1264DFF31627C4B7C9E8F7B58E8A5E87BCB382A4F3EB338C5C22`
- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\embeddings_bge_m3_960.npy`: `009FF1A640B2CE71823EBE5AFC493BABEFB20809989B650CBC9CEE465AAF5E46`
- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\MAPA_PASAJE_EMBEDDING_960.csv`: `31A2C0C775F2D542DE77885D3F9BFEFA67BD4E7801108762936A344794BAEDBA`
- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\checkpoints\checkpoint_bge_m3_960.json`: `5871FAC61158ADF1AE2AE96209DB93B05A564917D80D784AF50682705E4DB299`
- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\COMPUERTA_PRE_BGE.json`: `95BC2F9BE1792DBFEC2DD6BB86F8FF71D3EFDBB1E1E675931090AE94E1B1C88D`
- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\PRUEBA_CORTA_BGE_M3.json`: `58BA6D8FFB8514FCE13193A64DFE926498127D4B2BFB0950E926C8967CE7AD39`
- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\VALIDACION_FINAL_EMBEDDINGS.json`: `63DC67338544D7E026CBD7A4D340D94E3823B25861DEC2CB045E6DAB87624364`
- `C:\Users\USUARIO\Legado Patrimonial WSS\artifacts\expansion_corpus_1000\procesamiento_local_960_v1\PRUEBA_SEMANTICA_LOCAL_40_MAS_960.json`: `5DFB0B62DDBCF26AB3D23176ED62D061766249FB3934D8F2889069A98BB4A0D9`

## Cierre

Supabase no fue accedido ni modificado. No se reprocesaron embeddings de las 40 conferencias piloto. No se hizo commit ni push.
