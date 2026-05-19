import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkAIProviders, type AIProvider } from "@/lib/ai.server";

const PROVIDERS = [
  {
    id: "claude" as AIProvider,
    name: "Claude",
    model: "Sonnet 4.6",
    logo: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
      </svg>
    ),
    color: "from-orange-400 to-amber-500",
    desc: "Anthropic — Meilleur pour scripts longs",
  },
  {
    id: "gemini" as AIProvider,
    name: "Gemini",
    model: "2.0 Flash",
    logo: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
    color: "from-blue-400 to-indigo-500",
    desc: "Google — Rapide, gratuit",
  },
];

interface AIProviderSelectProps {
  value: AIProvider;
  onChange: (v: AIProvider) => void;
}

export function AIProviderSelect({ value, onChange }: AIProviderSelectProps) {
  const checkFn = useServerFn(checkAIProviders);
  const { data: available } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: () => checkFn(),
    staleTime: 60_000,
  });

  return (
    <div className="flex items-center gap-2 p-1 rounded-xl border border-neutral-200 bg-neutral-50">
      {PROVIDERS.map((p) => {
        const isAvailable = available ? available[p.id] : true;
        const isActive = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            disabled={!isAvailable}
            onClick={() => isAvailable && onChange(p.id)}
            title={isAvailable ? p.desc : `${p.name} non configuré (ajoutez ${p.id === "claude" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY"} dans .env)`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              isActive
                ? `bg-gradient-to-r ${p.color} text-white shadow-sm`
                : isAvailable
                ? "text-neutral-500 hover:bg-white hover:text-neutral-800"
                : "text-neutral-300 cursor-not-allowed"
            }`}
          >
            {p.logo}
            <span>{p.name}</span>
            <span className={`text-[10px] font-normal ${isActive ? "opacity-80" : "opacity-60"}`}>
              {p.model}
            </span>
            {!isAvailable && (
              <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-neutral-200 text-neutral-400 font-bold">
                Config
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
