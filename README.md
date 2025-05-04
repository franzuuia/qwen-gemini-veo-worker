# Qwen-Gemini-Veo Worker

Un Cloudflare Worker que proporciona un puente entre aplicaciones cliente y las APIs de Qwen, Google Gemini y Google Veo, facilitando el uso de estos modelos de IA con herramientas como n8n.

## Características

- Compatible con n8n a través de endpoints estándar
- Soporte para Qwen (chat, análisis de documentos e imágenes)
- Soporte para Google Gemini (chat, generación de texto, embeddings)
- Soporte para Google Veo (análisis de video, anotación, detección)
- Soporte para Veo 2 (generación avanzada de video)
- No requiere API keys adicionales, solo tu token de acceso

## Endpoints disponibles

### Endpoints de compatibilidad con n8n

```
GET /v1/models - Lista los modelos disponibles
POST /v1/chat/completions - Endpoint compatible para chat completions (redirige a Qwen)
```

### Qwen API

#### Chat Completions

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/qwen/chat/completions
Headers:
  Authorization: Bearer QWEN_API_KEY
  Content-Type: application/json

Body (JSON):
{
  "messages": [
    {
      "role": "user",
      "content": "Hola, ¿cómo estás?"
    }
  ],
  "stream": false
}
```

#### Análisis de documentos

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/qwen/analyze/document
Headers:
  Authorization: Bearer QWEN_API_KEY
  Content-Type: application/json

Body (JSON):
{
  "file_url": "URL de tu documento",
  "question": "pregunta sobre el documento"
}
```

#### Análisis de imágenes (visión)

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/qwen/analyze/image
Headers:
  Authorization: Bearer QWEN_API_KEY
  Content-Type: application/json

Body (JSON):
{
  "image_url": "URL de la imagen a analizar",
  "question": "pregunta sobre la imagen"
}
```

### Google Gemini API

#### Generación de texto

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/gemini/generate
Headers:
  X-Gemini-API-Key: TU_API_KEY_GEMINI
  Content-Type: application/json

Body (JSON):
{
  "prompt": "Escribe una historia corta sobre robots",
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 500
  }
}
```

#### Chat

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/gemini/chat
Headers:
  X-Gemini-API-Key: TU_API_KEY_GEMINI
  Content-Type: application/json

Body (JSON):
{
  "messages": [
    {
      "role": "user",
      "content": "Hola, ¿puedes ayudarme con un problema de matemáticas?"
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 500
  }
}
```

#### Generación de embeddings

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/gemini/generateEmbed
Headers:
  X-Gemini-API-Key: TU_API_KEY_GEMINI
  Content-Type: application/json

Body (JSON):
{
  "text": "Texto para generar embeddings"
}
```

### Google Veo API (Video)

#### Análisis de video

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/veo/analyze
Headers:
  X-Gemini-API-Key: TU_API_KEY_GEMINI
  Content-Type: application/json

Body (JSON):
{
  "videoUri": "URL pública del video a analizar",
  "prompt": "¿Qué está sucediendo en este video?"
}
```

También se puede utilizar la estructura completa de la API:

```json
{
  "request": {
    "prompt": "Describe what's happening in this video.",
    "videoUri": "gs://cloud-samples-data/video/animals.mp4"
  }
}
```

#### Anotación de video

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/veo/annotate
Headers:
  X-Gemini-API-Key: TU_API_KEY_GEMINI
  Content-Type: application/json

Body (JSON):
{
  "videoUri": "URL pública del video",
  "annotationTypes": ["SHOT_CHANGE", "FACE", "PERSON", "LOGO"]
}
```

#### Detección en video

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/veo/detect
Headers:
  X-Gemini-API-Key: TU_API_KEY_GEMINI
  Content-Type: application/json

Body (JSON):
{
  "videoUri": "URL pública del video",
  "detectionTypes": ["OBJECT", "PERSON", "LOGO", "TEXT"]
}
```

#### Generación de videos con Veo 2 (Nuevo)

```
Método: POST
URL: https://qwen-gemini-veo-worker.franzuuia.workers.dev/veo/generate/v2
Headers:
  X-Gemini-API-Key: TU_API_KEY_GEMINI
  Content-Type: application/json

Body (JSON - A partir de un prompt):
{
  "prompt": "Un astronauta montando un caballo en Marte",
  "generationConfig": {
    "duration": "15s",
    "resolution": "1080p",
    "fps": 30,
    "style": "cinematic"
  }
}
```

Para generar a partir de imágenes:

```json
{
  "images": [
    "https://ejemplo.com/imagen1.jpg",
    "https://ejemplo.com/imagen2.jpg",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABA..."
  ],
  "generationConfig": {
    "duration": "10s",
    "resolution": "1080p",
    "fps": 24,
    "style": "realistic"
  }
}
```

## Uso con n8n

Este worker puede ser utilizado con n8n para conectarse a los modelos de IA de dos formas:

### Método 1: Usando el nodo OpenAI

1. Crear un nodo OpenAI
2. Configurar con:
   - Base URL: `https://qwen-gemini-veo-worker.franzuuia.workers.dev`
   - API Key: Tu token de acceso de Qwen (login_aliyunid_ticket)
   - Modelo: puedes usar "qwen-turbo", "qwen-plus" o "qwen-max"

### Método 2: Usando el nodo HTTP Request

#### Ejemplo con Qwen:

1. Crear un nodo HTTP Request
2. Método: POST
3. URL: `https://qwen-gemini-veo-worker.franzuuia.workers.dev/qwen/chat/completions`
4. Autenticación: Header Auth
5. Headers:  
   * Authorization: Bearer QWEN_API_KEY  
   * Content-Type: application/json
6. Body (JSON):

```json
{
  "messages": [
    {
      "role": "user",
      "content": "{{$node['Input'].json.pregunta}}"
    }
  ],
  "stream": false
}
```

#### Ejemplo con Gemini:

1. Crear un nodo HTTP Request
2. Método: POST
3. URL: `https://qwen-gemini-veo-worker.franzuuia.workers.dev/gemini/generate`
4. Headers:  
   * X-Gemini-API-Key: TU_API_KEY_GEMINI  
   * Content-Type: application/json
5. Body (JSON):

```json
{
  "prompt": "{{$node['Input'].json.pregunta}}",
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 500
  }
}
```

#### Ejemplo con Veo 2 (generación avanzada de video):

1. Crear un nodo HTTP Request
2. Método: POST
3. URL: `https://qwen-gemini-veo-worker.franzuuia.workers.dev/veo/generate/v2`
4. Headers:  
   * X-Gemini-API-Key: TU_API_KEY_GEMINI  
   * Content-Type: application/json
5. Body (JSON):

```json
{
  "prompt": "{{$node['Input'].json.prompt_video}}",
  "generationConfig": {
    "duration": "15s",
    "resolution": "1080p",
    "fps": 30,
    "style": "cinematic"
  }
}
```

## Obtener tokens de acceso

### Para Qwen:

1. Accede a https://qianwen.biz.aliyun.com
2. Inicia sesión con tu cuenta de Alibaba Cloud
3. Una vez logueado, abre las DevTools de tu navegador (F12)
4. Ve a la pestaña "Application" (Aplicación)
5. En el panel izquierdo, selecciona "Cookies"
6. Busca la cookie llamada "login_aliyunid_ticket"
7. El valor de esta cookie es tu token de acceso

### Para Gemini/Veo:

1. Accede a https://gemini.google.com
2. Inicia sesión con tu cuenta de Google
3. Una vez logueado, abre las DevTools de tu navegador (F12)
4. Ve a la pestaña "Application" (Aplicación)
5. En el panel izquierdo, selecciona "Cookies"
6. Busca la cookie llamada "__Secure-1PSID"
7. El valor de esta cookie es tu token de acceso

## Despliegue

Si deseas desplegar tu propia instancia del worker:

1. Clona este repositorio
2. Instala Wrangler (CLI de Cloudflare Workers): `npm install -g wrangler`
3. Haz login en tu cuenta de Cloudflare: `wrangler login`
4. Despliega el worker: `wrangler deploy`

## Solución de problemas

Si encuentras un error "Authorization failed", verifica que:
1. Estás utilizando el token correcto (login_aliyunid_ticket o __Secure-1PSID)
2. Tu token no ha expirado (suelen durar unas horas/días)
3. El formato de la solicitud es correcto
4. Estás usando el endpoint correcto para el tipo de servicio (Qwen/Gemini/Veo)