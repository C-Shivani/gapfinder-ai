
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
    const question = String(formData.get("question") || "").trim();

    if (!(file instanceof File) || !question) {
      return NextResponse.json(
        { error: "Please upload a document and enter your question." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty." },
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

    if (documentText.length < 20) {
      return NextResponse.json(
        {
          error:
            "Could not find enough readable text in this document. Try a text-based PDF, TXT, or DOCX file."
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are GapFinder AI, a helpful study assistant.

Answer the student's question using only the uploaded document.
If the answer is not in the document, say:
"I couldn't find that information in your uploaded document."
Do not invent facts. Explain clearly in simple, student-friendly English.

STUDENT'S QUESTION:
${question}

UPLOADED DOCUMENT:
${documentText}`
    });

    const answer = result.text?.trim();

    if (!answer) {
      return NextResponse.json(
        { error: "The AI returned an empty answer. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("GapFinder AI Assistant error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The assistant could not answer. Please try again."
      },
      { status: 500 }
    );
  }
}
