// URLs base de las APIs
export const QWEN_API_BASE = 'https://qianwen.biz.aliyun.com';
export const GEMINI_API_BASE = 'https://gemini.google.com/api';
export const VEO_API_BASE = 'https://veo.google.com/api';
export const VEO2_API_BASE = 'https://veo.google.com/api/v2';

// Configuración de CORS
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Gemini-API-Key',
  'Access-Control-Max-Age': '86400',
};

// Utilidad para generar cookie de autenticación Qwen
export function generateQwenCookie(ticket) {
  return [
    `${ticket.length > 100 ? 'login_aliyunid_ticket' : 'tongyi_sso_ticket'}=${ticket}`,
    'aliyun_choice=intl',
    "_samesite_flag_=true"
  ].join("; ");
}

// Utilidad para convertir respuesta de stream a texto
export async function streamToJson(response) {
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
export function extractImageUrls(text, domain = 'wanx.alicdn.com') {
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

// Descarga y convierte una imagen a base64
export async function imageUrlToBase64(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return { base64, contentType };
  } catch (error) {
    console.error(`Error al convertir imagen a base64: ${error.message}`);
    throw error;
  }
}

// Utilidad para generar respuestas de error
export function errorResponse(message, status = 500, details = null) {
  const responseData = {
    error: message
  };
  
  if (details) {
    responseData.details = details;
  }
  
  return new Response(JSON.stringify(responseData), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}