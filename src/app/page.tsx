
"use client";

import { useState } from "react";

type Question = {
  question: string;
  options?: string[];
  answer?: string;
  correctAnswer?: string;
  explanation?: string;
};

const menu = [
  { name: "Dashboard", icon: "⌂" },
  { name: "My Materials", icon: "▤" },
  { name: "Quiz Generator", icon: "▣" },
  { name: "AI Assistant", icon: "✧" },
  { name: "Knowledge Gaps", icon: "◎" },
  { name: "Revision Plan", icon: "▦" },
  { name: "Progress", icon: "↗" },
  { name: "Settings", icon: "⚙" },
];

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [materials, setMaterials] = useState<string[]>([]);

  async function generateQuiz() {
    if (!file) {
      setError("Please upload a PDF, DOCX, or TXT file first.");
      return;
    }

    setLoading(true);
    setError("");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);

    try {
      const data = new FormData();
      data.append("file", file);

      const response = await fetch("/api/generate", {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Quiz generation failed.");
      }

      const generated = Array.isArray(result)
        ? result
        : result.questions ??
          result.quiz ??
          result.data?.questions ??
          [];

      if (!Array.isArray(generated) || generated.length === 0) {
        throw new Error(
          "The API returned no questions. Check the quiz API response and server terminal."
        );
      }

      setQuestions(generated);
      setMaterials((old) =>
        old.includes(file.name) ? old : [...old, file.name]
      );
      setActive("Quiz Generator");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while generating questions."
      );
    } finally {
      setLoading(false);
    }
  }

  async function askAssistant() {
    if (!file) {
      setError("Upload your study material first.");
      return;
    }

    if (!message.trim()) {
      setError("Please type a question.");
      return;
    }

    setLoading(true);
    setError("");
    setReply("");

    try {
      const data = new FormData();
      data.append("file", file);
      data.append("question", message);

      const response = await fetch("/api/assistant", {
        method: "POST",
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "The assistant request failed.");
      }

      setReply(
        result.answer ??
          result.response ??
          result.text ??
          result.message ??
          JSON.stringify(result)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not get an answer from the AI assistant."
      );
    } finally {
      setLoading(false);
    }
  }

  const score = questions.reduce((total, q, i) => {
    const correct = q.answer ?? q.correctAnswer ?? "";
    return total + (
      answers[i] && correct &&
      answers[i].trim().toLowerCase() === correct.trim().toLowerCase()
        ? 1
        : 0
    );
  }, 0);

  function heading() {
    const descriptions: Record<string, string> = {
      Dashboard: "Your personal AI-powered learning workspace.",
      "My Materials": "Manage your study documents in one place.",
      "Quiz Generator": "Turn your study notes into practice questions.",
      "AI Assistant": "Ask questions about your uploaded study material.",
      "Knowledge Gaps": "Review the questions and topics you need to revisit.",
      "Revision Plan": "Build a consistent study and revision routine.",
      Progress: "Track your learning activity and quiz performance.",
      Settings: "Manage your learning workspace.",
    };

    return descriptions[active];
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900 md:flex">
      <aside className="flex w-full shrink-0 flex-col border-r border-slate-200 bg-white p-5 md:sticky md:top-0 md:h-screen md:w-64">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-2xl text-white">
            ✧
          </div>
          <div>
            <h1 className="text-lg font-bold">GapFinder AI</h1>
            <p className="text-xs text-slate-500">Your learning companion</p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Workspace
        </p>

        <nav className="grid grid-cols-2 gap-2 md:grid-cols-1">
          {menu.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActive(item.name);
                setError("");
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                active === item.name
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-100"
                  : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="mt-6 rounded-2xl bg-violet-50 p-4">
          <p className="font-semibold text-violet-900">Study smarter ✨</p>
          <p className="mt-1 text-xs leading-5 text-violet-700">
            Upload your notes, practise with quizzes, and discover what to
            revise next.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-9">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Your workspace / {active}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              {active === "Dashboard" ? "Welcome back! 👋" : active}
            </h2>
            <p className="mt-2 text-sm text-slate-500">{heading()}</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium">
            ✦ AI Study Space
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {active === "Dashboard" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Study Materials", value: materials.length, icon: "▤" },
                { label: "Questions Generated", value: questions.length, icon: "▣" },
                { label: "Quiz Score", value: submitted && questions.length ? `${Math.round((score / questions.length) * 100)}%` : "—", icon: "↗" },
                { label: "Revision Topics", value: submitted ? questions.length - score : "—", icon: "◎" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <span className="text-xl text-violet-600">{stat.icon}</span>
                  </div>
                  <p className="mt-4 text-3xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <section className="rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-600 p-7 text-white shadow-lg">
                <p className="text-sm text-violet-100">YOUR NEXT STEP</p>
                <h3 className="mt-3 text-2xl font-bold">
                  Find your knowledge gaps
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-6 text-violet-100">
                  Upload your notes and generate a quiz to discover which
                  topics need more practice.
                </p>
                <button
                  onClick={() => setActive("Quiz Generator")}
                  className="mt-6 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                >
                  Create a quiz →
                </button>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6">
                <h3 className="text-lg font-bold">Quick access</h3>
                <div className="mt-4 space-y-3">
                  {[
                    ["My Materials", "Upload and manage your notes"],
                    ["AI Assistant", "Ask questions about your notes"],
                    ["Revision Plan", "Plan what to study next"],
                  ].map(([name, desc]) => (
                    <button
                      key={name}
                      onClick={() => setActive(name)}
                      className="block w-full rounded-xl border border-slate-100 p-4 text-left hover:border-violet-200 hover:bg-violet-50"
                    >
                      <span className="font-semibold">{name}</span>
                      <span className="mt-1 block text-xs text-slate-500">{desc}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}

        {["My Materials", "Quiz Generator", "AI Assistant"].includes(active) && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h3 className="text-xl font-bold">
              {active === "My Materials"
                ? "Upload study material"
                : active === "Quiz Generator"
                ? "Generate your quiz"
                : "Ask your AI assistant"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Choose a PDF, DOCX, or TXT document. The document will be sent to
              your configured API for processing.
            </p>

            <label className="mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-8 text-center hover:bg-violet-50">
              <span className="text-4xl">⇧</span>
              <span className="mt-3 font-semibold">
                {file ? file.name : "Choose your study file"}
              </span>
              <span className="mt-2 text-xs text-slate-500">
                PDF, DOCX, or TXT
              </span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                className="mt-4 block max-w-full text-sm"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                  setError("");
                  setReply("");
                  if (selected) {
                    setMaterials((old) =>
                      old.includes(selected.name) ? old : [...old, selected.name]
                    );
                  }
                }}
              />
            </label>

            {active === "My Materials" && (
              <div className="mt-6">
                <h4 className="font-semibold">Your materials</h4>
                {materials.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    No files selected yet.
                  </p>
                ) : (
                  materials.map((name) => (
                    <p key={name} className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                      📄 {name}
                    </p>
                  ))
                )}
              </div>
            )}

            {active === "Quiz Generator" && (
              <button
                disabled={loading}
                onClick={generateQuiz}
                className="mt-6 w-full rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {loading ? "Generating questions..." : "✦ Generate quiz"}
              </button>
            )}

            {active === "AI Assistant" && (
              <div className="mt-6">
                <label htmlFor="question" className="mb-2 block text-sm font-semibold">
                  What do you want to understand?
                </label>
                <textarea
                  id="question"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explain the main concepts in my notes..."
                  className="min-h-28 w-full rounded-xl border border-slate-200 p-4 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />
                <button
                  disabled={loading}
                  onClick={askAssistant}
                  className="mt-4 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {loading ? "Thinking..." : "Ask AI →"}
                </button>
                {reply && (
                  <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-violet-50 p-5 text-sm leading-7">
                    <h4 className="mb-2 font-bold">AI response</h4>
                    {reply}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {active === "Quiz Generator" && questions.length > 0 && (
          <section className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold">Your generated questions</h3>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-sm text-violet-700">
                {questions.length} questions
              </span>
            </div>

            {questions.map((q, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                  Question {i + 1}
                </p>
                <h4 className="mt-3 font-semibold leading-6">{q.question}</h4>
                <div className="mt-4 space-y-2">
                  {(q.options ?? []).map((option, j) => (
                    <label
                      key={j}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${
                        submitted &&
                        option.trim().toLowerCase() ===
                          (q.answer ?? q.correctAnswer ?? "").trim().toLowerCase()
                          ? "border-green-300 bg-green-50"
                          : answers[i] === option
                          ? "border-violet-300 bg-violet-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${i}`}
                        value={option}
                        checked={answers[i] === option}
                        disabled={submitted}
                        onChange={() =>
                          setAnswers((old) => ({ ...old, [i]: option }))
                        }
                      />
                      {option}
                    </label>
                  ))}
                </div>

                {submitted && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6">
                    <p className="font-semibold">
                      Correct answer: {q.answer ?? q.correctAnswer ?? "Not provided"}
                    </p>
                    {q.explanation && <p className="mt-2">{q.explanation}</p>}
                  </div>
                )}
              </div>
            ))}

            {!submitted ? (
              <button
                onClick={() => setSubmitted(true)}
                className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white hover:bg-violet-700"
              >
                Submit answers
              </button>
            ) : (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
                <h3 className="text-2xl font-bold">
                  Your score: {score}/{questions.length}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Review the correct answers and revisit any topics you missed.
                </p>
                <button
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                  }}
                  className="mt-4 rounded-xl bg-white px-5 py-3 font-semibold text-violet-700"
                >
                  Try again
                </button>
              </div>
            )}
          </section>
        )}

        {active === "Knowledge Gaps" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-bold">Topics to revisit</h3>
            {submitted && questions.length > 0 ? (
              questions.map((q, i) =>
                answers[i]?.trim().toLowerCase() ===
                (q.answer ?? q.correctAnswer ?? "").trim().toLowerCase() ? null : (
                  <div key={i} className="mt-4 rounded-xl bg-amber-50 p-4">
                    <p className="text-sm font-semibold">{q.question}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Correct answer: {q.answer ?? q.correctAnswer ?? "Not provided"}
                    </p>
                  </div>
                )
              )
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Complete and submit a quiz to identify questions you missed.
              </p>
            )}
          </section>
        )}

        {active === "Revision Plan" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-bold">Your revision checklist</h3>
            <p className="mt-2 text-sm text-slate-500">
              Use this checklist to organize your next study session.
            </p>
            <div className="mt-5 space-y-3">
              {["Review your uploaded notes", "Practise a quiz", "Revisit incorrect answers", "Repeat the quiz"].map((task) => (
                <label key={task} className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                  <input type="checkbox" />
                  {task}
                </label>
              ))}
            </div>
          </section>
        )}

        {active === "Progress" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-bold">Learning progress</h3>
            <p className="mt-4 text-sm text-slate-600">
              Materials selected: {materials.length}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Latest quiz questions: {questions.length}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Latest score: {submitted && questions.length ? `${score}/${questions.length}` : "Complete a quiz to see your score."}
            </p>
          </section>
        )}

        {active === "Settings" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h3 className="text-xl font-bold">Settings</h3>
            <p className="mt-3 text-sm text-slate-500">
              GapFinder AI uses the API endpoints configured in your project.
              Your Gemini API key should stay in the private .env.local file.
            </p>
          </section>
        )}

        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs text-slate-400">
          GapFinder AI · Learn smarter, one topic at a time.
        </footer>
      </main>
    </div>
  );
}
