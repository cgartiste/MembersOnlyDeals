import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkAIProviders, type AIProvider } from "@/lib/ai.server";

export const PROVIDER_META: Record<AIProvider, {
  name: string; model: string; color: string; textColor: string;
  badge?: string; desc: string; getKeyUrl: string;
}> = {
  claude: {
    name: "Claude",      model: "Sonnet 4.6",
    color: "from-orange-400 to-amber-500", textColor: "text-orange-700",
    desc: "Anthropic — Meilleur pour scripts longs et analyses fines",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  gemini: {
    name: "Gemini",      model: "2.0 Flash",
    color: "from-blue-400 to-indigo-500", textColor: "text-blue-700",
    desc: "Google — Rapide, quota gratuit",
    getKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  groq: {
    name: "Groq",        model: "Llama 3.3 70B",
    color: "from-emerald-400 to-teal-500", textColor: "text-emerald-700",
    badge: "Ultra rapide",
    desc: "Groq — Inférence la plus rapide du marché, gratuit",
    getKeyUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    name: "OpenRouter",  model: "+300 modèles",
    color: "from-violet-500 to-purple-600", textColor: "text-violet-700",
    badge: "Modèles gratuits",
    desc: "OpenRouter — Accès à tous les modèles dont gratuits",
    getKeyUrl: "https://openrouter.ai/keys",
  },
};

interface AIProviderSelectProps {
  value: AIProvider;
  onChange: (v: AIProvider) => void;
  compact?: boolean;
}

export function AIProviderSelect({ value, onChange, compact = false }: AIProviderSelectProps) {
  const checkFn = useServerFn(checkAIProviders);
  const { data: available } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: () => checkFn(),
    staleTime: 60_000,
  });

  const providers = Object.entries(PROVIDER_META) as Array<[AIProvider, typeof PROVIDER_META[AIProvider]]>;

  if (compact) {
    return (
      <div className="flex items-center gap-1 p-1 rounded-xl border border-neutral-200 bg-neutral-50">
        {providers.map(([id, meta]) => {
          const isAvailable = available ? available[id] : false;
          const isActive = value === id;
          return (
            <button key={id} type="button" disabled={!isAvailable}
              onClick={() => isAvailable && onChange(id)}
              title={isAvailable ? meta.desc : `${meta.name} non configuré — ${meta.getKeyUrl}`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive ? `bg-gradient-to-r ${meta.color} text-white shadow-sm`
                : isAvailable ? "text-neutral-500 hover:bg-white hover:text-neutral-800"
                : "text-neutral-300 cursor-not-allowed"
              }`}>
              <span>{meta.name}</span>
              {isActive && <span className="opacity-80 font-normal text-[10px]">{meta.model.split(" ")[0]}</span>}
              {!isAvailable && <span className="text-[9px] uppercase px-1 rounded bg-neutral-200 text-neutral-400">Config</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {providers.map(([id, meta]) => {
        const isAvailable = available ? available[id] : false;
        const isActive = value === id;
        return (
          <button key={id} type="button"
            onClick={() => isAvailable ? onChange(id) : window.open(meta.getKeyUrl, "_blank")}
            className={`relative rounded-2xl border-2 p-4 text-left transition-all ${
              isActive ? `border-violet-400 bg-violet-50 shadow-md`
              : isAvailable ? "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
              : "border-neutral-100 bg-neutral-50 opacity-70"
            }`}>
            {meta.badge && (
              <span className={`absolute top-2 right-2 text-[9px] uppercase px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? "bg-violet-200 text-violet-700" : "bg-neutral-200 text-neutral-500"
              }`}>
                {meta.badge}
              </span>
            )}
            {isActive && (
              <div className="absolute top-2 left-2 h-2 w-2 rounded-full bg-violet-500" />
            )}
            <div className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-bold mb-2 bg-gradient-to-r ${meta.color} text-white`}>
              {meta.name}
            </div>
            <div className="text-xs font-medium text-neutral-700">{meta.model}</div>
            <div className="text-[11px] text-neutral-400 mt-1 leading-snug">{meta.desc}</div>
            {!isAvailable && (
              <div className="mt-2 text-[10px] text-violet-600 font-semibold">
                → Configurer la clé API
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
