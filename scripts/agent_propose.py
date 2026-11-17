"""Agente experimental de propostas: Ollama local gratis ou Gemini opcional. Sem deploy."""
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

target = Path("src/comparator_search.mjs")
original = target.read_text(encoding="utf-8")
token = os.environ.get("GEMINI_API_KEY")
backend = (os.environ.get("AI_BACKEND") or ("gemini" if token else "ollama")).strip()
if backend not in ("gemini", "ollama"):
    raise SystemExit("Backend de IA fora da lista permitida")
prompt = (
    "Revise este modulo JavaScript de filtro de produtos. Corrija apenas bugs objetivos "
    "de correspondencia de texto, normalizacao e selecao, preservando a API exportada. "
    "Nao adicione dependencias, rede, arquivos ou efeitos colaterais. "
    "Retorne SOMENTE o conteudo completo do arquivo JavaScript, sem markdown. "
    "Se nao houver correcao segura, retorne o arquivo inalterado.\n\n" + original
)
if backend == "gemini":
    if not token:
        raise SystemExit("GEMINI_API_KEY ausente: nenhuma chamada de Gemini")
    model = (os.environ.get("AI_MODEL") or "gemini-3.5-flash-lite").strip()
    if model not in ("gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"):
        raise SystemExit("Modelo fora da lista gratuita permitida.")
    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 3000},
    }).encode("utf-8")
    req = Request(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
        data=payload,
        headers={"x-goog-api-key": token, "Content-Type": "application/json",
                 "Accept": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=120) as response:
            result = json.load(response)
        proposal = "".join(
            part.get("text", "") for part in result["candidates"][0]["content"]["parts"]
        ).strip()
    except Exception as exc:
        raise SystemExit("Gemini indisponivel ou cota esgotada; nenhuma mudanca: " + str(exc))
else:
    # Ollama roda somente no runner local; nunca transmite codigo ou chaves a um endpoint publico.
    payload = json.dumps({
        "model": "qwen2.5-coder:1.5b",
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.1, "num_ctx": 4096, "num_predict": 1800},
    }).encode("utf-8")
    req = Request(
        "http://127.0.0.1:11434/api/generate",
        data=payload, headers={"Content-Type": "application/json"}, method="POST",
    )
    try:
        with urlopen(req, timeout=360) as response:
            result = json.load(response)
        proposal = str(result["response"]).strip()
    except Exception as exc:
        raise SystemExit("Modelo local indisponivel; nenhuma mudanca: " + str(exc))

if proposal.startswith("```"):
    proposal = "\n".join(proposal.splitlines()[1:-1]).strip()
if not proposal or len(proposal) > 30000 or "import(" in proposal or "fetch(" in proposal:
    raise SystemExit("Proposta rejeitada por verificacoes preventivas.")
if proposal != original.strip():
    target.write_text(proposal + "\n", encoding="utf-8")
    print("Proposta gerada; testes e revisao de PR obrigatorios.")
else:
    print("Nenhuma alteracao necessaria.")
