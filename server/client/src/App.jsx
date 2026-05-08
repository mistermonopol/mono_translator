import { useState } from 'react';
import { Languages, Mic, Square, Volume2 } from 'lucide-react';
import { useRealtimeTranslation } from './hooks/useRealtimeTranslation';

const LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Japanese',
  'Korean',
  'Mandarin Chinese'
];

export default function App() {
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const { targetText, isStreaming, startStreaming, stopStreaming } = useRealtimeTranslation();

  const onToggle = async () => {
    if (isStreaming) {
      stopStreaming();
    } else {
      await startStreaming(sourceLanguage, targetLanguage);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold flex items-center gap-3">
          <Languages className="w-8 h-8 text-emerald-400" />
          Realtime Interpreter
        </h1>
        <p className="text-slate-400 mt-2">
          Speak in your source language and see the translated text update live.
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-4 space-y-8">
        <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm uppercase tracking-wide text-slate-400">Source language</span>
              <select
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:border-emerald-400 focus:outline-none"
                value={sourceLanguage}
                onChange={(event) => setSourceLanguage(event.target.value)}
              >
                {LANGUAGES.map((language) => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm uppercase tracking-wide text-slate-400">Target language</span>
              <select
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:border-emerald-400 focus:outline-none"
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
              >
                {LANGUAGES.filter((language) => language !== sourceLanguage).map((language) => (
                  <option key={language}>{language}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={onToggle}
              className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium text-base bg-emerald-500 text-emerald-950 hover:bg-emerald-400 transition-colors"
            >
              {isStreaming ? (
                <>
                  <Square className="w-4 h-4" /> Stop interpreting
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> Start interpreting
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Volume2 className="w-4 h-4" />
              <span>{isStreaming ? 'Listening…' : 'Tap start to begin'}</span>
            </div>
          </div>
        </section>

        <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 shadow-xl min-h-[260px]">
          <header className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Live translation</h2>
              <p className="text-sm text-slate-400">{sourceLanguage} → {targetLanguage}</p>
            </div>
            {isStreaming && <span className="text-xs font-semibold text-emerald-400">Streaming…</span>}
          </header>

          <p className="whitespace-pre-wrap text-xl leading-relaxed text-slate-100 min-h-[160px]">
            {targetText || 'Your translation will appear here.'}
          </p>
        </section>
      </main>
    </div>
  );
}
