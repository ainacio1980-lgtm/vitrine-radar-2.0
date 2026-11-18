"""Backlog funcional fechado e testes fixos em vez de prompts livres de issues."""
import unittest
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch
from scripts.feature_agent import FEATURES, feature_for, next_feature, implement, verified_fallback

class FeatureAgentPolicyTests(unittest.TestCase):
    def test_fallback_concreto_preserva_regras_e_libera_funcionalidades(self):
        search = Path("src/comparator_search.mjs").read_text(encoding="utf-8")
        result = verified_fallback("search-unicode-width", search)
        if '.normalize("NFKD")' in search:
            self.assertIsNone(result, "Fallback nao deve alterar funcionalidade concluida")
        else:
            self.assertIsNotNone(result)
            self.assertIn('.normalize("NFKD")', result)
            self.assertIn('export function normalizeProductSearch', result)
        audit = Path("scripts/check-public-catalog.mjs").read_text(encoding="utf-8")
        result = verified_fallback("catalog-duplicate-affiliate-link", audit)
        if "seenUrls.add(affiliate.href)" in audit:
            self.assertIsNone(result, "Fallback nao deve duplicar codigo ja integrado")
        else:
            self.assertIsNotNone(result)
            self.assertIn("seenUrls.add(affiliate.href)", result)
            self.assertIn("affiliateDestinationForMarketplace", result)
        self.assertIsNone(verified_fallback("outra-tarefa", audit))

    def test_controlador_executa_em_modo_script_no_runner(self):
        result = subprocess.run(
            [sys.executable, "scripts/feature_agent.py", "--next"],
            check=True, capture_output=True, text=True, timeout=10,
        )
        task = next_feature()
        expected = "none" if task is None else "|".join(
            task[key] for key in ("slug", "target", "test")
        )
        self.assertEqual(result.stdout.strip(), expected)

    def test_lista_fechada_e_arquivos_nao_sensiveis(self):
        names = [x['slug'] for x in FEATURES]
        self.assertEqual(len(names), len(set(names)))
        self.assertGreaterEqual(len(names), 2)
        for task in FEATURES:
            self.assertIn(task['target'], ('src/comparator_search.mjs', 'scripts/check-public-catalog.mjs'))
            self.assertTrue(task['spec'].startswith('agent_specs/'))
            self.assertTrue(task['test'].startswith('tests/'))
            self.assertEqual(feature_for(task['slug']), task)
        with self.assertRaises(ValueError):
            feature_for('../../src/worker.mjs')

    def test_seleciona_primeira_tarefa_com_teste_ainda_nao_integrado(self):
        with patch.object(Path, 'exists', side_effect=[True, False]):
            task = next_feature()
        self.assertEqual(task['slug'], 'catalog-duplicate-affiliate-link')
        with patch.object(Path, 'exists', return_value=True):
            self.assertIsNone(next_feature())

    def test_nao_sobrescreve_tarefa_ja_concluida(self):
        with patch.object(Path, 'exists', return_value=True), \
             patch.object(Path, 'write_text') as write:
            with self.assertRaises(SystemExit):
                implement(FEATURES[0]['slug'])
        write.assert_not_called()

    def test_cada_funcionalidade_tem_teste_real_de_aceite(self):
        for task in FEATURES:
            content = Path(task['spec']).read_text(encoding='utf-8')
            self.assertIn("from 'node:test'", content)
            self.assertIn("assert.", content)
            self.assertNotIn('eval(',content)

if __name__ == '__main__':
    unittest.main()
