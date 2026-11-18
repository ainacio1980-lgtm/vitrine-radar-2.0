"""Executor de funcionalidades test-driven, restrito a arquivos existentes e testes imutaveis.

O modelo local gera somente um arquivo permitido. Nao faz merge, deploy, writes no D1,
alteracao de secrets nem edicao dos testes de aceite.
"""
import os
import shutil
import sys
from pathlib import Path

if __package__:
    from .agent_propose import run_model, validate_proposal
else:
    from agent_propose import run_model, validate_proposal

# Funcionalidades reais com testes reprodutiveis. A ordem define a prioridade.
FEATURES = (
    {
        "slug": "search-unicode-width",
        "target": "src/comparator_search.mjs",
        "spec": "agent_specs/search-unicode-width.test.mjs",
        "test": "tests/search-unicode-width.test.mjs",
        "goal": "Corrigir busca de produtos escrita com caracteres Unicode de largura total "
                "(full-width), sem mudar cores, capacidade de memoria, modelos ou API.",
    },
    {
        "slug": "catalog-duplicate-affiliate-link",
        "target": "scripts/check-public-catalog.mjs",
        "spec": "agent_specs/catalog-duplicate-affiliate-link.test.mjs",
        "test": "tests/catalog-duplicate-affiliate-link.test.mjs",
        "goal": "Rejeitar URLs de afiliado duplicadas entre ofertas publicadas, mesmo quando "
                "possuem IDs diferentes e aparecem em paginas distintas. Nao fazer writes.",
    },
)


def next_feature():
    for entry in FEATURES:
        if not Path(entry["test"]).exists():
            return entry
    return None


def feature_for(slug):
    for entry in FEATURES:
        if entry["slug"] == slug:
            return entry
    raise ValueError("Funcionalidade fora da lista permitida")


def verified_fallback(slug, original):
    """Edicoes deterministicas limitadas a ancoras exatas; caso contrario nao altera nada."""
    if slug == "search-unicode-width":
        before = 'String(text ?? "").normalize("NFD")'
        after = 'String(text ?? "").normalize("NFKD")'
        if original.count(before) == 1 and "NFKD" not in original:
            return original.replace(before, after)
    elif slug == "catalog-duplicate-affiliate-link":
        before = "  const seen = new Set();"
        validated = """      try {
        affiliateDestinationForMarketplace(offer.merchant, offer.url);
      } catch {
        throw new Error('Link de afiliado invalido para a loja: ' + id);
      }
"""
        changed = """      let affiliate;
      try {
        affiliate = affiliateDestinationForMarketplace(offer.merchant, offer.url);
      } catch {
        throw new Error('Link de afiliado invalido para a loja: ' + id);
      }
      if (seenUrls.has(affiliate.href)) throw new Error('Link afiliado duplicado: ' + id);
      seenUrls.add(affiliate.href);
"""
        if original.count(before) == 1 and original.count(validated) == 1 and "seenUrls" not in original:
            return original.replace(before, before + "\n  const seenUrls = new Set();").replace(validated, changed)
    return None


def implement(slug):
    task = feature_for(slug)
    source_path = Path(task["target"])
    spec_path = Path(task["spec"])
    test_path = Path(task["test"])
    if test_path.exists():
        raise SystemExit("Tarefa ja concluida: nao gerar duplicata")
    if source_path.stat().st_size > 10000 or spec_path.stat().st_size > 6000:
        raise SystemExit("Codigo ou especificacao grande demais para revisao segura")
    before = source_path.read_text(encoding="utf-8")
    specification = spec_path.read_text(encoding="utf-8")
    requirement = (
        "Implemente esta funcionalidade concreta com criterio de aceite ja testado. "
        "Nao altere o arquivo de testes nem adicione dependencias. Preserve a API publica "
        "e todas as regras de seguranca. Apenas o arquivo indicado pode mudar. "
        "Se a implementacao for impossivel, retorne o codigo original inalterado. "
        "\nObjetivo: " + task["goal"] + "\nTestes de aceite (somente leitura):\n" + specification
    )
    try:
        candidate = run_model(task["target"], before, requirement)
    except Exception as exc:
        raise SystemExit("Modelo local indisponivel: " + str(exc)) from exc
    if candidate.startswith("```"):
        candidate = "\n".join(candidate.splitlines()[1:-1]).strip()
    method = "modelo local"
    if candidate == before.strip():
        candidate = verified_fallback(slug, before)
        method = "fallback deterministico"
    else:
        try:
            validate_proposal(task["target"], before, candidate)
        except ValueError as exc:
            print("::warning::IA recusada pela politica: " + str(exc))
            candidate = verified_fallback(slug, before)
            method = "fallback deterministico"
    if not candidate or candidate.strip() == before.strip():
        print("::notice::Nenhuma implementacao segura disponivel; original preservado.")
        raise SystemExit(10)
    try:
        validate_proposal(task["target"], before, candidate)
    except ValueError as exc:
        raise SystemExit("Proposta final insegura, sem writes: " + str(exc)) from exc
    source_path.write_text(candidate.rstrip() + "\n", encoding="utf-8")
    shutil.copyfile(spec_path, test_path)
    print("Funcionalidade proposta: " + slug + " via " + method +
          " (aceite imutavel e testes obrigatorios).")


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--next":
        task = next_feature()
        print("none" if task is None else "|".join(task[key] for key in ("slug", "target", "test")))
    elif len(sys.argv) == 3 and sys.argv[1] == "--implement":
        implement(sys.argv[2])
    else:
        raise SystemExit("Uso: --next ou --implement SLUG")
