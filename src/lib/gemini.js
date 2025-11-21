const GEMINI_API_KEY = ""; // Google AI Studio Key
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

export async function callGemini(prompt) {
  if (!GEMINI_API_KEY) return "API 키 미설정: 멘탈 케어 기능을 사용할 수 없습니다.";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );
    if (!response.ok) throw new Error(`API Error`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "AI 응답 실패";
  } catch (error) {
    return "AI 연결 오류";
  }
}

