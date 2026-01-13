import { GoogleGenerativeAI } from "@google/generative-ai";
import { Subject, AgentType } from "../types";

// CẤU HÌNH MODEL
const MODEL_CONFIG = {
  TEXT: 'gemini-1.5-flash',
  TIMEOUT: 15000 
};

// Khởi tạo SDK chuẩn
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("API Key không tồn tại! Hãy kiểm tra cấu hình Netlify.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

const cache = new Map<string, string>();

const getCacheKey = (subject: string, agent: string, input: string, imageHash: string = '') => 
  `${subject}|${agent}|${input.trim()}|${imageHash}`;

const SYSTEM_PROMPTS: Record<AgentType, string> = {
  [AgentType.SPEED]: `Bạn là chuyên gia giải đề thi. Trả về JSON: {"finalAnswer": "...", "casioSteps": "..."}. Chỉ dùng LaTeX.`,
  [AgentType.SOCRATIC]: `Bạn là giáo sư Socratic. Giải chi tiết, khoa học, ngắn gọn. Chỉ dùng LaTeX.`,
  [AgentType.PERPLEXITY]: `Liệt kê 2 dạng bài tập vận dụng cao liên quan. Trả về nội dung khoa học.`,
};

// Hàm thực thi an toàn
async function safeExecute<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    if (error.toString().includes('429')) {
      throw new Error("Hệ thống đang quá tải, vui lòng đợi giây lát.");
    }
    throw error;
  }
}

export const processTask = async (subject: Subject, agent: AgentType, input: string, image?: string) => {
  const cacheKey = getCacheKey(subject, agent, input, image ? 'has_img' : 'no_img');
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  return safeExecute(async () => {
    // Cách gọi model chuẩn của SDK @google/generative-ai
    const model = genAI.getGenerativeModel({ 
        model: MODEL_CONFIG.TEXT,
        generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            // Nếu là agent SPEED thì yêu cầu trả về JSON
            responseMimeType: agent === AgentType.SPEED ? "application/json" : "text/plain"
        }
    });

    let promptContent = `Môn: ${subject}. Vai trò: ${SYSTEM_PROMPTS[agent]}. \nNội dung câu hỏi: ${input}`;
    
    const contents: any[] = [];
    
    // Xử lý ảnh nếu có
    if (image) {
      contents.push({
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: image.split(',')[1] } },
          { text: promptContent }
        ]
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: promptContent }]
      });
    }

    const result = await model.generateContent({ contents });
    const response = await result.response;
    const text = response.text();

    if (text) cache.set(cacheKey, text);
    return text;
  });
};

// Các hàm khác như generateSummary, generateSimilarQuiz bạn làm tương tự 
// Bằng cách sử dụng genAI.getGenerativeModel...
