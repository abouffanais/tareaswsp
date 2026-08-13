/**
 * =========================================================
 *  KC · Webhook de WhatsApp (Vercel Serverless Function)
 * =========================================================
 * Ruta desplegada: https://tu-proyecto.vercel.app/api/whatsapp-webhook
 * Esta es la URL que configuras en Twilio Sandbox como
 * "WHEN A MESSAGE COMES IN".
 *
 * Variables de entorno necesarias en Vercel:
 * - ANTHROPIC_API_KEY   (para interpretar texto libre)
 * - APPS_SCRIPT_URL     (la URL /exec de tu Apps Script)
 * - SHARED_SECRET       (misma clave que pusiste en Apps Script)
 */

export default async function handler(req, res) {
  try {
    const body = req.body?.Body || "";
    const from = req.body?.From || ""; // formato: whatsapp:+56912345678

    if (!body.trim()) {
      return respondTwiml(res, "No recibí texto en el mensaje.");
    }

    // 1) Intento de formato fijo: "Tarea / Grupo / Prioridad / Fecha(opcional)"
    let parsed = tryFixedFormat(body);

    // 2) Si no calza el formato fijo, se interpreta con IA (texto libre)
    if (!parsed) {
      parsed = await parseWithClaude(body);
    }

    if (!parsed || !parsed.tarea) {
      return respondTwiml(
        res,
        "No pude entender la tarea 😅. Prueba con:\n" +
        "Consultar figura remuneración / Kitchen Center Internacional / Urgente"
      );
    }

    // 3) Guardar en Google Sheets vía Apps Script
    const saveRes = await fetch(process.env.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: process.env.SHARED_SECRET,
        tarea: parsed.tarea,
        grupo: parsed.grupo || "Sin grupo",
        prioridad: parsed.prioridad || "Media",
        fecha_limite: parsed.fecha_limite || "",
        telefono: from
      })
    });
    const saveData = await saveRes.json();

    if (!saveData.success) {
      return respondTwiml(res, "Ocurrió un error al guardar la tarea. Intenta de nuevo.");
    }

    return respondTwiml(
      res,
      `✅ Tarea registrada [#${saveData.id}]\n` +
      `📌 ${parsed.tarea}\n` +
      `🌍 ${parsed.grupo || "Sin grupo"}\n` +
      `⚡ Prioridad: ${parsed.prioridad || "Media"}` +
      (parsed.fecha_limite ? `\n📅 Vence: ${parsed.fecha_limite}` : "")
    );
  } catch (err) {
    console.error(err);
    return respondTwiml(res, "Hubo un error procesando tu mensaje.");
  }
}

/** Formato fijo: "Tarea / Grupo / Prioridad / Fecha opcional (yyyy-mm-dd)" */
function tryFixedFormat(text) {
  const parts = text.split("/").map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  return {
    tarea: parts[0],
    grupo: parts[1],
    prioridad: parts[2] || "Media",
    fecha_limite: parts[3] || ""
  };
}

/** Texto libre interpretado por Claude */
async function parseWithClaude(text) {
  const hoyISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }); // YYYY-MM-DD

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system:
        `Hoy es ${hoyISO} (zona horaria America/Santiago, Chile). ` +
        "Extrae de un mensaje de WhatsApp una tarea de gestión financiera/corporativa. " +
        "Responde SOLO con un JSON válido, sin texto adicional, con este formato exacto: " +
        `{"tarea": "...", "grupo": "...", "prioridad": "Baja|Media|Alta|Urgente", "fecha_limite": "YYYY-MM-DD o vacío"}. ` +
        "Calcula cualquier fecha relativa (mañana, el viernes, en 3 días, etc.) tomando como referencia la fecha de hoy indicada arriba. " +
        "Si no se menciona un grupo/empresa/mundo, usa 'Sin grupo'. Si no se menciona prioridad, usa 'Media'.",
      messages: [{ role: "user", content: text }]
    })
  });

  const data = await response.json();
  const raw = data.content?.[0]?.text || "{}";
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function respondTwiml(res, message) {
  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
  );
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
