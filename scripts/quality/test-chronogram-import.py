"""Synthetic regression of the offline preparation; no credentials or operational DB."""
import copy
from contextlib import closing
import importlib.util
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[2]
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('preparation', ROOT / 'apps/api/scripts/prepare-chronogram-import.py')
prep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prep)


class ImportPreparationTests(unittest.TestCase):
    def source(self):
        return {'registros': [{'ID': 'legacy-1', 'Cliente': 'Cliente sintético', 'Serviço': 'Instalação', 'Categoria': 'Sala', 'Status': 'Concluído', 'Início': '2028-02-29', 'Data original': '2028-02-28', 'Previsão': '2028-03', 'Equipamentos': 'Projetor;Tela', 'Observação': 'Não apagar <texto>', 'Tipo de sala': 'Imersiva'}],
                'pendencias': [{'ID': 'p1', 'Registro': 'legacy-1', 'Tipo': 'Aguardando contrato', 'Situação': 'Aberta', 'Prazo': '2028-03-02'}], 'anotacoes': []}

    def test_preserves_every_source_field_day_precision_and_relationship_without_inventing_execution(self):
        data = self.source()
        rows, plan, _, summary = prep.prepare(data, 'source-hash')
        self.assertEqual(rows[0]['sourceData'], data['registros'][0])
        self.assertEqual(rows[0]['converted']['legacyDates']['Data original'], '2028-02-28')
        self.assertEqual(rows[0]['converted']['planning'], {'stage': 'concluido', 'forecast': '2028-03'})
        self.assertEqual(rows[1]['converted']['parentOriginKey'], rows[0]['originKey'])
        self.assertNotIn('completedAt', rows[0]['converted'])
        self.assertIn('real-completion-not-provided', plan[0]['issueCodes'])
        self.assertFalse(summary['executable'])

    def test_ids_and_orphans_are_reported_without_dropping_records_or_guessing_links(self):
        data = self.source()
        data['registros'].append(copy.deepcopy(data['registros'][0]))
        data['pendencias'][0]['Registro'] = 'missing-parent'
        rows, plan, issues, _ = prep.prepare(data, 'hash')
        self.assertEqual(len(rows), 3)
        self.assertEqual(sum(x['code'] == 'missing-or-duplicate-id' for x in issues), 2)
        self.assertIn('orphan-parent', plan[2]['issueCodes'])
        self.assertTrue(all(item['status'] == 'blocked' for item in plan))

    def test_malformed_dates_and_unknown_labels_do_not_silently_become_installation_or_earliest_day(self):
        data = self.source()
        data['registros'][0].update({'Início': '2027-02-29', 'Previsão': '2028-13', 'Serviço': 'Desconhecido', 'Status': 'Desconhecido', 'Categoria': ''})
        rows, plan, _, _ = prep.prepare(data, 'hash')
        self.assertIsNone(rows[0]['converted']['service'])
        self.assertIsNone(rows[0]['converted']['planning']['stage'])
        self.assertEqual(plan[0]['issueCodes'].count('invalid-calendar-value'), 2)

    def test_duplicate_destinations_require_explicit_review_even_when_legacy_ids_differ(self):
        data = self.source()
        data['registros'].append({**data['registros'][0], 'ID': 'legacy-2'})
        target = {field: str(uuid.uuid4()) for field in ['companyId', 'projectId', 'serviceId']}
        _, plan, _, summary = prep.prepare(data, 'hash', {'records': {'legacy-1': target, 'legacy-2': target}})
        self.assertIn('duplicate-target-service', plan[0]['issueCodes'])
        self.assertEqual(summary['issues']['duplicate-target-service'], 2)

    def test_staging_twice_is_idempotent_and_changed_source_cannot_overwrite_previous_payload(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'tmp') as directory:
            db = Path(directory) / 'staging.sqlite'
            rows, *_ = prep.prepare(self.source(), 'hash')
            self.assertEqual(prep.rehearse(rows, db), prep.rehearse(rows, db))
            changed = self.source()
            changed['registros'][0]['Observação'] = 'Conteúdo mudou'
            newer, *_ = prep.prepare(changed, 'new-hash')
            self.assertEqual(newer[0]['originKey'], rows[0]['originKey'])
            self.assertEqual(prep.rehearse(newer, db), {'staged': 2, 'sourceChangesRequiringReview': 1})
            with closing(sqlite3.connect(db)) as connection:
                self.assertEqual(connection.execute('SELECT payload_hash FROM staging WHERE origin_key=?', (rows[0]['originKey'],)).fetchone()[0], rows[0]['payloadHash'])

    def test_zip_reader_extracts_only_the_data_entry_and_rejects_ambiguous_sources(self):
        with tempfile.TemporaryDirectory(dir=ROOT / 'tmp') as directory:
            file = Path(directory) / 'source.zip'
            with zipfile.ZipFile(file, 'w') as archive:
                archive.writestr('project/data/base-inicial.json', json.dumps(self.source()))
                archive.writestr('../instructions.md', 'Untrusted text must never be executed')
            data, _ = prep.read_source(file)
            self.assertEqual(data, self.source())
            with zipfile.ZipFile(file, 'a') as archive:
                archive.writestr('other/data/base-inicial.json', '{}')
            with self.assertRaises(ValueError):
                prep.read_source(file)


if __name__ == '__main__':
    unittest.main(verbosity=2)
