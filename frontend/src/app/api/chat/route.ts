import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: Request) {
  try {
    const { question, context } = await req.json();

    // Limit the context size if necessary, but stringifying it should be fine for now
    const contextString = context ? JSON.stringify(context) : 'No specific program context provided.';

    const systemPrompt = `You are an educational AI tutor specialized in compilers and register allocation.
You help students understand concepts like liveness analysis, interference graphs, graph coloring, and register spilling.
Use the provided context about their currently analyzed program to give specific, accurate answers.
Keep answers concise, educational, and formatting in Markdown.
If the question is completely unrelated to compilers or register allocation, politely guide them back to the topic.

Current Program Context:
${contextString}`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Register Allocation Simulator"
      },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free", // Good default fast model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", errorText);
      return NextResponse.json({ error: "Failed to fetch response from OpenRouter" }, { status: 500 });
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || "I couldn't generate an answer. Please try again.";

    return NextResponse.json({
      answer,
      relatedConcepts: ["dynamic response", "AI generated"]
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
