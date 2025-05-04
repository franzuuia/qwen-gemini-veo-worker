// Handlers para Gemini y Veo
import { corsHeaders, GEMINI_API_BASE, VEO_API_BASE, VEO2_API_BASE, imageUrlToBase64, errorResponse } from './utils.js';

// Manejo de solicitudes a Gemini
export async function handleGeminiRequest(request, path) {
  try {
    // Extraer el API key de Gemini del header
    const authHeader = request.headers.get('X-Gemini-API-Key');
    if (!authHeader) {
      return errorResponse('X-Gemini-API-Key header is required', 401);
    }
    
    const geminiApiKey = authHeader;
    
    // Obtener el cuerpo de la solicitud
    const requestData = await request.clone().json();
    
    // Procesar según el endpoint
    if (path === '/gemini/generate') {
      return await handleGeminiGenerate(requestData, geminiApiKey);
    } else if (path === '/gemini/chat') {
      return await handleGeminiChat(requestData, geminiApiKey);
    } else if (path === '/gemini/embeddingContent' || path === '/gemini/generateEmbed') {
      return await handleGeminiEmbed(requestData, geminiApiKey);
    } else {
      return errorResponse('Invalid Gemini endpoint', 400);
    }
  } catch (error) {
    console.error(`Error en solicitud Gemini: ${error.message}`);
    return errorResponse('Error processing Gemini request', 500, error.message);
  }
}

// Generación de texto con Gemini
async function handleGeminiGenerate(requestData, token) {
  const { prompt, generationConfig = {} } = requestData;
  
  if (!prompt) {
    return errorResponse('Prompt is required', 400);
  }
  
  // Solicitud a la API de Gemini
  const geminiRequest = new Request(`${GEMINI_API_BASE}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `__Secure-1PSID=${token}`
    },
    body: JSON.stringify({
      prompt: { text: prompt },
      temperature: generationConfig.temperature || 0.7,
      maxOutputTokens: generationConfig.maxOutputTokens || 1024,
      topK: generationConfig.topK || 40,
      topP: generationConfig.topP || 0.95
    })
  });
  
  const response = await fetch(geminiRequest);
  const responseData = await response.json();
  
  return new Response(JSON.stringify(responseData), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Chat con Gemini
async function handleGeminiChat(requestData, token) {
  const { messages, generationConfig = {} } = requestData;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return errorResponse('Messages array is required', 400);
  }
  
  // Transformar mensajes al formato de Gemini
  const geminiContents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
  }));
  
  // Solicitud a la API de Gemini
  const geminiRequest = new Request(`${GEMINI_API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `__Secure-1PSID=${token}`
    },
    body: JSON.stringify({
      contents: geminiContents,
      generationConfig: {
        temperature: generationConfig.temperature || 0.7,
        maxOutputTokens: generationConfig.maxOutputTokens || 1024,
        topK: generationConfig.topK || 40,
        topP: generationConfig.topP || 0.95
      }
    })
  });
  
  const response = await fetch(geminiRequest);
  const responseData = await response.json();
  
  // Formatear la respuesta en un formato compatible
  return new Response(JSON.stringify({
    id: crypto.randomUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gemini-pro",
    choices: [{
      message: {
        role: "assistant",
        content: responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No response"
      },
      index: 0,
      finish_reason: "stop"
    }],
    usage: {
      prompt_tokens: responseData.usageMetadata?.promptTokenCount || 0,
      completion_tokens: responseData.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: (responseData.usageMetadata?.promptTokenCount || 0) + 
                   (responseData.usageMetadata?.candidatesTokenCount || 0)
    }
  }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Generación de embeddings con Gemini
async function handleGeminiEmbed(requestData, token) {
  const { text, content } = requestData;
  const textToEmbed = text || content || "";
  
  if (!textToEmbed) {
    return errorResponse('Text content is required', 400);
  }
  
  // Solicitud a la API de Gemini para embeddings
  const geminiRequest = new Request(`${GEMINI_API_BASE}/embedding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `__Secure-1PSID=${token}`
    },
    body: JSON.stringify({
      text: textToEmbed
    })
  });
  
  const response = await fetch(geminiRequest);
  const responseData = await response.json();
  
  return new Response(JSON.stringify(responseData), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Manejo de solicitudes a Veo
export async function handleVeoRequest(request, path) {
  try {
    // Extraer el API key de Gemini/Veo del header (usamos la misma)
    const authHeader = request.headers.get('X-Gemini-API-Key');
    if (!authHeader) {
      return errorResponse('X-Gemini-API-Key header is required', 401);
    }
    
    const apiKey = authHeader;
    
    // Obtener el cuerpo de la solicitud
    const requestData = await request.clone().json();
    
    // Procesar según el endpoint
    if (path === '/veo/analyze') {
      return await handleVeoAnalyze(requestData, apiKey);
    } else if (path === '/veo/annotate') {
      return await handleVeoAnnotate(requestData, apiKey);
    } else if (path === '/veo/detect') {
      return await handleVeoDetect(requestData, apiKey);
    } else if (path === '/veo/generate' || path === '/veo/generate/v1') {
      return await handleVeoGenerate(requestData, apiKey);
    } else if (path === '/veo/generate/v2') {
      return await handleVeoGenerateV2(requestData, apiKey);
    } else {
      return errorResponse('Invalid Veo endpoint', 400);
    }
  } catch (error) {
    console.error(`Error en solicitud Veo: ${error.message}`);
    return errorResponse('Error processing Veo request', 500, error.message);
  }
}

// Análisis de video con Veo
async function handleVeoAnalyze(requestData, token) {
  // Formatear la solicitud al formato correcto de Veo
  let veoRequestBody = requestData;
  
  // Si es una solicitud simplificada, convertirla al formato correcto
  if (!requestData.request && (requestData.videoUri || requestData.content || requestData.prompt)) {
    veoRequestBody = {
      request: {
        prompt: requestData.prompt || "Describe what's happening in this video.",
        videoUri: requestData.videoUri,
        content: requestData.content
      }
    };
  }
  
  // Solicitud a la API de Veo
  const veoRequest = new Request(`${VEO_API_BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `__Secure-1PSID=${token}`
    },
    body: JSON.stringify(veoRequestBody)
  });
  
  const response = await fetch(veoRequest);
  const responseData = await response.json();
  
  return new Response(JSON.stringify(responseData), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Anotación de video con Veo
async function handleVeoAnnotate(requestData, token) {
  // Verificar datos requeridos
  if (!requestData.videoUri) {
    return errorResponse('videoUri is required', 400);
  }
  
  // Solicitud a la API de Veo
  const veoRequest = new Request(`${VEO_API_BASE}/annotate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `__Secure-1PSID=${token}`
    },
    body: JSON.stringify(requestData)
  });
  
  const response = await fetch(veoRequest);
  const responseData = await response.json();
  
  return new Response(JSON.stringify(responseData), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Detección en video con Veo
async function handleVeoDetect(requestData, token) {
  // Verificar datos requeridos
  if (!requestData.videoUri) {
    return errorResponse('videoUri is required', 400);
  }
  
  // Solicitud a la API de Veo
  const veoRequest = new Request(`${VEO_API_BASE}/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `__Secure-1PSID=${token}`
    },
    body: JSON.stringify(requestData)
  });
  
  const response = await fetch(veoRequest);
  const responseData = await response.json();
  
  return new Response(JSON.stringify(responseData), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Generación de video con Veo (v1)
async function handleVeoGenerate(requestData, token) {
  // Formato de la solicitud para generación de video
  const { prompt, image_url } = requestData;
  
  if (!prompt && !image_url) {
    return errorResponse('prompt or image_url is required', 400);
  }
  
  let imageBase64 = null;
  
  // Si hay una imagen, procesarla
  if (image_url) {
    try {
      if (image_url.startsWith('data:')) {
        // Ya está en formato base64
        const parts = image_url.split(',');
        imageBase64 = parts[1];
      } else {
        // Descargar y convertir a base64
        const { base64 } = await imageUrlToBase64(image_url);
        imageBase64 = base64;
      }
    } catch (error) {
      return errorResponse('Error processing image', 400, error.message);
    }
  }
  
  // Solicitud a la API de Veo
  const veoRequest = new Request(`${VEO_API_BASE}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `__Secure-1PSID=${token}`
    },
    body: JSON.stringify({
      prompt: prompt || "Create a video from this image",
      input_type: image_url ? "image" : "text",
      image_data: imageBase64,
      output_type: "video",
      duration: requestData.duration || 5,
      style: requestData.style || "cinematic"
    })
  });
  
  const response = await fetch(veoRequest);
  const responseData = await response.json();
  
  return new Response(JSON.stringify({
    id: crypto.randomUUID(),
    created: Math.floor(Date.now() / 1000),
    data: {
      url: responseData.video?.url || null,
      status: responseData.status || "processing"
    },
    original_response: responseData
  }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Generación avanzada de video con Veo 2
async function handleVeoGenerateV2(requestData, token) {
  // Formatear solicitud según el tipo (prompt o imágenes)
  const { prompt, images, generationConfig = {} } = requestData;
  
  if (!prompt && (!images || images.length === 0)) {
    return errorResponse('prompt or images array is required', 400);
  }
  
  const config = {
    duration: generationConfig.duration || "15s",
    resolution: generationConfig.resolution || "1080p",
    fps: generationConfig.fps || 30,
    style: generationConfig.style || "cinematic"
  };
  
  let veoRequestBody = {
    generation_config: config
  };
  
  // Si hay un prompt, lo usamos
  if (prompt) {
    veoRequestBody.text_prompt = prompt;
  }
  
  // Si hay imágenes, procesarlas
  if (images && images.length > 0) {
    const processedImages = [];
    
    for (const image of images) {
      try {
        if (image.startsWith('data:')) {
          // Ya está en formato base64
          const parts = image.split(',');
          processedImages.push({
            data: parts[1],
            type: parts[0].split(':')[1].split(';')[0]
          });
        } else {
          // Descargar y convertir a base64
          const { base64, contentType } = await imageUrlToBase64(image);
          processedImages.push({
            data: base64,
            type: contentType
          });
        }
      } catch (error) {
        console.error(`Error procesando imagen: ${error.message}`);
        // Continuamos con las siguientes imágenes
      }
    }
    
    if (processedImages.length === 0) {
      return errorResponse('No valid images could be processed', 400);
    }
    
    veoRequestBody.images = processedImages;
  }
  
  // Solicitud a la API de Veo 2
  const veoRequest = new Request(`${VEO2_API_BASE}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `__Secure-1PSID=${token}`
    },
    body: JSON.stringify(veoRequestBody)
  });
  
  const response = await fetch(veoRequest);
  const responseData = await response.json();
  
  return new Response(JSON.stringify({
    id: crypto.randomUUID(),
    created: Math.floor(Date.now() / 1000),
    status: responseData.status || "processing",
    data: {
      video_id: responseData.video_id || null,
      url: responseData.url || null,
      preview_url: responseData.preview_url || null,
      eta_seconds: responseData.eta_seconds || 60
    },
    original_response: responseData
  }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}