# Exportación e importación de credenciales en Agentflow V2

Esta guía describe el flujo actual para preservar los nombres de las credenciales al exportar flujos de Agentflow V2 (y otros `ChatFlow`) y cómo se reconstruyen automáticamente al importarlos.

## Qué se incluye en la exportación

* `generateExportFlowData` continúa eliminando cualquier clave `FLOWISE_CREDENTIAL_ID` de los nodos para no exponer IDs sensibles en el archivo descargado.【F:packages/ui/src/utils/genericHelper.js†L551-L607】
* Antes de que los datos lleguen al cliente, `exportImportService.exportData` inspecciona cada `ChatFlow`, identifica los nodos que referencian credenciales y adjunta una sección `credentialBindings` con pares `{ nodeId, path, credentialName, credentialType }`. Sólo se incluyen entradas cuyo nombre y tipo pudieron resolverse en la base de datos.【F:packages/server/src/services/export-import/index.ts†L224-L327】【F:packages/server/src/services/export-import/index.ts†L180-L222】
* Al exportar un workspace, la sección `credentialBindings` se conserva dentro del JSON de cada flujo, junto con la lista de nodos y edges ya sanitizados.【F:packages/ui/src/utils/exportImport.js†L22-L30】【F:packages/ui/src/utils/genericHelper.js†L559-L606】

## Cómo se reconstruyen al importar

* Durante la importación, `exportImportService.importData` busca la sección `credentialBindings` en cada flujo y consulta las credenciales disponibles en el workspace de destino (incluyendo compartidas) por nombre y tipo.【F:packages/server/src/services/export-import/index.ts†L329-L433】
* Si encuentra una coincidencia, inserta el nuevo ID bajo la clave `FLOWISE_CREDENTIAL_ID` en el nodo indicado y elimina la sección `credentialBindings` antes de persistir el flujo.【F:packages/server/src/services/export-import/index.ts†L374-L433】
* Cuando no existe una credencial con el mismo nombre y tipo, se registra una advertencia en los logs para que el usuario pueda completar la vinculación de forma manual tras la importación.【F:packages/server/src/services/export-import/index.ts†L356-L433】

## Notas y limitaciones

* Sólo se generan entradas en `credentialBindings` para credenciales resolubles; si un flujo hacía referencia a una credencial eliminada, no habrá mapeo automático y el nodo seguirá requiriendo configuración manual al importarse.
* El mecanismo confía en que los nombres de credencial y sus tipos (`credentialName`) coincidan exactamente entre origen y destino. Diferencias en mayúsculas/minúsculas o en el tipo impedirán la reconexión automática.
* Las exportaciones individuales desde el canvas no incluyen `credentialBindings`; el mapeo automático sólo se aplica a las exportaciones de workspace.
