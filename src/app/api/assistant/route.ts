
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import pdf from "pdf-parse";
import mammoth from "mammoth";


export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing from .env.local." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const count = Math.min(
      20,
      Math.max(1, Number(formData.get("count")) || 5)
    );
    const questionType = String(
      formData.get("questionType") || "MCQ"
    );

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a PDF, TXT, or DOCX file." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Please upload a file smaller than 10 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.toLowerCase();
    let documentText = "";

    if (filename.endsWith(".pdf")) {
      const result = await pdf(buffer);
      documentText = result.text;
    } else if (filename.endsWith(".txt")) {
      documentText = buffer.toString("utf8");
    } else if (filename.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      documentText = result.value;
    } else {
      return NextResponse.json(
        { error: "Supported formats are PDF, TXT, and DOCX." },
        { status: 400 }
      );
    }

    documentText = documentText.trim().slice(0, 60000);

    if (documentText.length < 50) {
      return NextResponse.json(
        {
          error:
            "Not enough readable text was found. Try a text-based PDF or DOCX file."
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an educational quiz generator.

Create exactly ${count} questions based ONLY on the document below.
Question type requested: ${questionType}.

Return valid JSON only, with this structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "answer": "The correct answer",
      "explanation": "Brief explanation based on the document",
      "sourceQuote": "A short exact quote from the document supporting the answer"
    }
  ]
}

Rules:
- Do not invent facts or use outside knowledge.
- Every answer must be supported by the document.
- For MCQ, provide four options and one correct answer.
- For short-answer questions, options may be an empty array.
- Keep sourceQuote faithful to the document.
- If the document does not contain enough information, create fewer questions rather than inventing facts.

DOCUMENT:
${documentText}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const responseText = response.text || "";
    const cleaned = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.questions)) {
      throw new Error("The AI returned an unexpected question format.");
    }

    return NextResponse.json({
      questions: parsed.questions.slice(0, count)
    });
  } catch (error) {
    console.error("Quiz generation error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Quiz generation failed. Please try again."
      },
      { status: 500 }
    );
  }
}
