// Worker para conectar con Qwen, Gemini y Veo API
// Autor: franzuuia

// Configuración de API Keys y endpoints
const QWEN_AUTH_HEADER = ''; // Se pasará en la solicitud
const GEMINI_API_KEY = ''; // Se pasará en la solicitud

// URLs base de las APIs
const QWEN_API_BASE = 'https://qianwen.biz.aliyun.com';
const GEMINI_API_BASE = 'https://gemini.google.com/api';
const VEO_API_BASE = 'https://veo.google.com/api';
// API para generación de videos Veo 2
const VEO2_API_BASE = 'https://veo.google.com/api/v2';

// Configuración de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Gemini-API-Key',
  'Access-Control-Max-Age': '86400',
};

// Utilidades generales
function generateQwenCookie(ticket) {
  return [
    `${ticket.length > 100 ? 'login_aliyunid_ticket' : 'tongyi_sso_ticket'}=${ticket}`,
    'aliyun_choice=intl',
    "_samesite_flag_=true"
  ].join("; ");
}

async function streamToJson(response) {
  const text = await response.text();
  let result = "";
  
  // Procesar respuesta SSE
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data:") && line !== "data: [DONE]") {
      try {
        const data = JSON.parse(line.substring(5));
        if (data.contents && data.contents.length > 0) {
          for (const content of data.contents) {
            if (content.role === "assistant" && content.content) {
              result += content.content;
            }
          }
        }
      } catch (e) {
        console.error("Error al parsear línea:", e);
      }
    }
  }
  
  return result;
}

// Extrae URLs de imágenes de una respuesta de texto
function extractImageUrls(text, domain = 'wanx.alicdn.com') {
  const urls = [];
  const lines = text.split("\n");
  
  for (const line of lines) {
    if (line.startsWith("data:") && line !== "data: [DONE]") {
      try {
        const data = JSON.parse(line.substring(5));
        if (data.contents) {
          const content = data.contents.map(c => c.content || '').join(' ');
          const foundUrls = content.match(/https?:\/\/[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=\,]*)/gi) || [];
          for (const url of foundUrls) {
            if (url.includes(domain) && !urls.includes(url)) {
              const urlObj = new URL(url);
              urlObj.search = "";
              urls.push(urlObj.toString());
            }
          }
        }
      } catch (e) {
        console.error("Error al parsear línea:", e);
      }
    }
  }
  
  return urls;
}

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
        veo: ['/veo/analyze', '/veo/annotate', '/veo/detect', '/veo/generate'],
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
        return new Response(JSON.stringify({ error: 'Authorization required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
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
      return new Response(JSON.stringify({ 
        error: 'Error processing request',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }