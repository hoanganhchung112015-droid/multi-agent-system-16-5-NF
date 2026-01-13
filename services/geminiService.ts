import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Khởi tạo - Lưu ý dùng đúng biến môi trường có VITE_
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const MODEL_NAME = "gemini-1.5-flash";

export const processTask = async (subject: string, agent: string, input: string, image?: string) => {
  if (!genAI) {
    console.error("API Key không tồn tại! Hãy kiểm tra cấu hình Netlify.");
    throw new Error("Cấu hình API Key bị thiếu.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    let promptContent = `Môn: ${subject}. Chuyên gia: ${agent}. Nội dung: ${input}`;
    const parts: any[] = [{ text: promptContent }];

    if (image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image.includes(",") ? image.split(",")[1] : image
        }
      });
    }

    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const response = await result.response;
    return response.text();

  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
};
