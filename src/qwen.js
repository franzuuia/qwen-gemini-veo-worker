// Handlers para Qwen API
import { corsHeaders, QWEN_API_BASE, streamToJson, extractImageUrls, generateQwenCookie } from './utils.js';

// Manejo de solicitudes a la API de Qwen
export async function handleQwenRequest(request, path) {
  try {
    // Extraer el token de autorización
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authorization header is required' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Obtener el cuerpo de la solicitud
    const requestData = await request.clone().json();
    
    // Determinar el endpoint según la ruta
    let qwenEndpoint;
    
    if (path === '/qwen/chat/completions') {
      return await handleQwenChat(requestData, token);
    } else if (path === '/qwen/analyze/document') {
      return await handleQwenDocumentAnalysis(requestData, token);
    } else if (path === '/qwen/analyze/image') {
      return await handleQwenImageAnalysis(requestData, token);
    } else if (path === '/qwen/images/generations') {
      return await handleQwenImageGeneration(requestData, token);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid Qwen endpoint' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  } catch (error) {
    console.error(`Error en solicitud Qwen: ${error.message}`);
    return new Response(JSON.stringify({ 
      error: 'Error processing Qwen request',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Handler para el chat con Qwen
export async function handleQwenChat(requestData, token) {
  const { messages, stream = false, conversation_id = "" } = requestData;
  
  // Preparar el último mensaje
  let lastMessage = "";
  if (messages && messages.length > 0) {
    const lastMsgObj = messages[messages.length - 1];
    if (typeof lastMsgObj.content === 'string') {
      lastMessage = lastMsgObj.content;
    } else if (Array.isArray(lastMsgObj.content)) {
      lastMessage = lastMsgObj.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join(' ');
    }
  }
  
  // Preparar mensajes en formato Qwen
  const qwenRequest = new Request(`${QWEN_API_BASE}/dialog/conversation`, {
    method: "POST",
    headers: {
      "Accept": stream ? "text/event-stream" : "application/json",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      "Pragma": "no-cache",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "X-Platform": "pc_tongyi",
      "Cookie": generateQwenCookie(token)
    },
    body: JSON.stringify({
      mode: "chat",
      model: "",
      action: "next",
      userAction: "chat",
      requestId: crypto.randomUUID(),
      sessionId: conversation_id ? conversation_id.split("-")[0] : "",
      sessionType: "text_chat",
      parentMsgId: conversation_id ? conversation_id.split("-")[1] || "" : "",
      params: {
        fileUploadBatchId: crypto.randomUUID(),
        searchType: ""
      },
      contents: [{
        content: lastMessage,
        contentType: "text",
        role: "user"
      }]
    })
  });

  // Enviar solicitud a Qwen
  const qwenResponse = await fetch(qwenRequest);
  
  // Si es streaming, pasar la respuesta tal cual
  if (stream) {
    return new Response(qwenResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        ...corsHeaders
      }
    });
  }
  
  // Procesar respuesta no streaming
  const responseContent = await streamToJson(qwenResponse);
  
  // Devolver respuesta en formato compatible con OpenAI
  return new Response(JSON.stringify({
    id: crypto.randomUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "qwen",
    choices: [{
      message: {
        role: "assistant",
        content: responseContent
      },
      index: 0,
      finish_reason: "stop"
    }],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    }
  }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Handler para generación de imágenes con Qwen
export async function handleQwenImageGeneration(requestData, token) {
  const { prompt } = requestData;
  
  // Crear solicitud para generar imagen con Qwen
  const qwenRequest = new Request(`${QWEN_API_BASE}/dialog/conversation`, {
    method: "POST",
    headers: {
      "Accept": "text/event-stream",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      "Pragma": "no-cache",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "X-Platform": "pc_tongyi",
      "Cookie": generateQwenCookie(token)
    },
    body: JSON.stringify({
      mode: "chat",
      model: "",
      action: "next",
      userAction: "chat",
      requestId: crypto.randomUUID(),
      sessionId: "",
      sessionType: "text_chat",
      parentMsgId: "",
      params: {
        fileUploadBatchId: crypto.randomUUID()
      },
      contents: [{
        content: prompt.indexOf('画') == -1 ? `请画：${prompt}` : prompt,
        contentType: "text",
        role: "user"
      }]
    })
  });

  // Enviar solicitud a Qwen
  const qwenResponse = await fetch(qwenRequest);
  const text = await qwenResponse.text();
  
  // Extraer URLs de imágenes
  const imageUrls = extractImageUrls(text, 'wanx.alicdn.com');
  
  // Devolver respuesta en formato similar a DALL-E
  return new Response(JSON.stringify({
    created: Math.floor(Date.now() / 1000),
    data: imageUrls.map(url => ({ url }))
  }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Handler para análisis de documentos con Qwen
export async function handleQwenDocumentAnalysis(requestData, token) {
  const { file_url, question } = requestData;
  
  // Solicitud para análisis de documento con Qwen
  const qwenRequest = new Request(`${QWEN_API_BASE}/dialog/conversation`, {
    method: "POST",
    headers: {
      "Accept": "text/event-stream",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      "Pragma": "no-cache",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "X-Platform": "pc_tongyi",
      "Cookie": generateQwenCookie(token)
    },
    body: JSON.stringify({
      mode: "chat",
      model: "",
      action: "next",
      userAction: "chat",
      requestId: crypto.randomUUID(),
      sessionId: "",
      sessionType: "text_chat",
      parentMsgId: "",
      params: {
        fileUploadBatchId: crypto.randomUUID()
      },
      contents: [
        {
          role: "user",
          contentType: "file",
          content: file_url,
          ext: { fileSize: 0 }
        },
        {
          role: "user",
          contentType: "text",
          content: question || "Por favor analiza este documento"
        }
      ]
    })
  });

  // Enviar solicitud a Qwen
  const qwenResponse = await fetch(qwenRequest);
  const responseContent = await streamToJson(qwenResponse);
  
  // Devolver respuesta en formato compatible
  return new Response(JSON.stringify({
    id: crypto.randomUUID(),
    created: Math.floor(Date.now() / 1000),
    analysis: responseContent
  }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}

// Handler para análisis de imágenes con Qwen
export async function handleQwenImageAnalysis(requestData, token) {
  const { image_url, question } = requestData;
  
  // Solicitud para análisis de imagen con Qwen
  const qwenRequest = new Request(`${QWEN_API_BASE}/dialog/conversation`, {
    method: "POST",
    headers: {
      "Accept": "text/event-stream",
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      "Pragma": "no-cache",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "X-Platform": "pc_tongyi",
      "Cookie": generateQwenCookie(token)
    },
    body: JSON.stringify({
      mode: "chat",
      model: "",
      action: "next",
      userAction: "chat",
      requestId: crypto.randomUUID(),
      sessionId: "",
      sessionType: "text_chat",
      parentMsgId: "",
      params: {
        fileUploadBatchId: crypto.randomUUID()
      },
      contents: [
        {
          role: "user",
          contentType: "image",
          content: image_url
        },
        {
          role: "user",
          contentType: "text",
          content: question || "¿Qué hay en esta imagen?"
        }
      ]
    })
  });

  // Enviar solicitud a Qwen
  const qwenResponse = await fetch(qwenRequest);
  const responseContent = await streamToJson(qwenResponse);
  
  // Devolver respuesta en formato compatible
  return new Response(JSON.stringify({
    id: crypto.randomUUID(),
    created: Math.floor(Date.now() / 1000),
    analysis: responseContent
  }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders
    }
  });
}