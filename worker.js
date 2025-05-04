// Worker para conectar con Qwen, Gemini y Veo API
// Versión optimizada con soporte para n8n
// Autor: franzuuia

import { corsHeaders, errorResponse } from './src/utils.js';
import { handleQwenRequest } from './src/qwen.js';
import { handleGeminiRequest, handleVeoRequest } from './src/gemini-veo.js';

// Handler principal para todas las solicitudes
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Función principal para manejar solicitudes
async function handleRequest(request) {
  // Manejar solicitudes CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Obtener ruta de la URL
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log(`Solicitud recibida en: ${path}`);

  // Endpoint principal / verificación
  if (path === '/' || path === '') {
    return new Response(JSON.stringify({
      status: 'ok',
      message: 'API Bridge for Qwen, Gemini and Veo running',
      endpoints: {
        qwen: ['/qwen/chat/completions', '/qwen/analyze/document', '/qwen/analyze/image'],
        gemini: ['/gemini/generate', '/gemini/chat', '/gemini/embeddingContent', '/gemini/generateEmbed'],
        veo: ['/veo/analyze', '/veo/annotate', '/veo/detect', '/veo/generate', '/veo/generate/v2'],
        compat: ['/v1/models', '/v1/chat/completions'] // Endpoints de compatibilidad para n8n
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  // Endpoint para listar modelos (compatibilidad con n8n)
  if (path === '/v1/models') {
    return new Response(JSON.stringify({
      object: "list",
      data: [
        {
          id: "qwen-max",
          object: "model",
          created: 1686935002,
          owned_by: "aliyun"
        },
        {
          id: "qwen-plus",
          object: "model",
          created: 1686935002,
          owned_by: "aliyun"
        },
        {
          id: "qwen-turbo",
          object: "model",
          created: 1686935002,
          owned_by: "aliyun"
        },
        {
          id: "gemini-pro",
          object: "model",
          created: 1686935002,
          owned_by: "google"
        }
      ]
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  // Endpoint para completions (compatibilidad con n8n)
  if (path === '/v1/chat/completions') {
    try {
      // Obtener token de autorización
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        return errorResponse('Authorization required', 401);
      }
      
      // Crear una nueva solicitud modificada a /qwen/chat/completions
      const newUrl = new URL(request.url);
      newUrl.pathname = '/qwen/chat/completions';
      
      // Clonar la solicitud con la nueva URL
      const newRequest = new Request(newUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: request.redirect,
        signal: request.signal
      });
      
      // Procesar como si fuera una solicitud a /qwen/chat/completions
      return await handleQwenRequest(newRequest, '/qwen/chat/completions');
    } catch (error) {
      console.error(`Error en solicitud de compatibilidad: ${error.message}`);
      return errorResponse('Error processing request', 500, error.message);
    }
  }

  // Rutas de Qwen
  if (path.startsWith('/qwen/')) {
    return handleQwenRequest(request, path);
  }
  
  // Rutas de Gemini
  if (path.startsWith('/gemini/')) {
    return handleGeminiRequest(request, path);
  }

  // Rutas de Veo
  if (path.startsWith('/veo/')) {
    return handleVeoRequest(request, path);
  }
  
  // Si no coincide con ninguna ruta
  return errorResponse('Endpoint not found', 404, {
    available_endpoints: {
      qwen: ['/qwen/chat/completions', '/qwen/analyze/document', '/qwen/analyze/image'],
      gemini: ['/gemini/generate', '/gemini/chat', '/gemini/embeddingContent', '/gemini/generateEmbed'],
      veo: ['/veo/analyze', '/veo/annotate', '/veo/detect', '/veo/generate', '/veo/generate/v2'],
      compat: ['/v1/models', '/v1/chat/completions']
    }
  });
}