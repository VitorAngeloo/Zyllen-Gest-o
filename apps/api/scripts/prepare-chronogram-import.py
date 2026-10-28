"""Offline review/staging only. This program has no database or HTTP client."""
import argparse
from collections import Counter
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import unicodedata
import uuid
import zipfile

ROOT = Path(__file__).resolve().parents[3]
STAGES = dict(zip(
    ['aguardando contrato', 'aguardando kickoff', 'sem previsao', 'data pre-definida', 'agendado por e-mail', 'pausado', 'concluido', 'cancelado'],
    ['contrato', 'kickoff', 'semprev', 'predef', 'agendado', 'pausado', 'concluido', 'cancelado']))
SERVICES = {'instalacao': 'INSTALLATION', 'desinstalacao': 'REMOVAL', 'manutencao': 'MAINTENANCE'}


def normalized(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.strip().lower()) if unicodedata.category(c) != 'Mn')


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def calendar_value(value, monthly=False):
    if not value:
        return None
    if not re.fullmatch(r'\d{4}-\d{2}' + (r'(?:-\d{2})?' if monthly else r'-\d{2}'), value):
        raise ValueError('date-format')
    parts = [int(x) for x in value.split('-')]
    if not 1970 <= parts[0] <= 9999:
        raise ValueError('date-range')
    date(*(parts if len(parts) == 3 else [*parts, 1]))
    return value


def read_source(source):
    if source.suffix.lower() == '.zip':
        with zipfile.ZipFile(source) as archive:
            entries = [entry for entry in archive.infolist() if entry.filename.endswith('/data/base-inicial.json') or entry.filename == 'data/base-inicial.json']
            if len(entries) != 1 or entries[0].file_size > 20_000_000:
                raise ValueError('Expected exactly one base-inicial.json of at most 20 MB')
            raw = archive.read(entries[0])
    else:
        if source.stat().st_size > 20_000_000:
            raise ValueError('Source exceeds 20 MB')
        raw = source.read_bytes()
    data = json.loads(raw.decode('utf-8-sig'))
    if not isinstance(data, dict) or set(data) != {'registros', 'pendencias', 'anotacoes'}:
        raise ValueError('Invalid source collections')
    for rows in data.values():
        if not isinstance(rows, list) or any(not isinstance(row, dict) or any(not isinstance(k, str) or not isinstance(v, str) for k, v in row.items()) for row in rows):
            raise ValueError('Every row must contain only text fields')
    return data, hashlib.sha256(raw).hexdigest()


def prepare(data, source_hash, mappings=None):
    mappings = mappings or {}
    issues, staged, plan = [], [], []
    ids = {kind: Counter(row.get('ID', '') for row in rows) for kind, rows in data.items()}
    all_records = set(ids['registros']) - {''}
    similarities = Counter(tuple(normalized(row.get(field, '')) for field in ['Cliente', 'Cidade/UF', 'Serviço', 'Categoria', 'Início']) for row in data['registros'])

    def issue(code, kind, index, field=''):
        issues.append({'code': code, 'collection': kind, 'row': index + 1, 'field': field})

    for kind, rows in data.items():
        for index, row in enumerate(rows):
            legacy_id = row.get('ID', '')
            row_issues = len(issues)
            if not legacy_id.strip() or ids[kind][legacy_id] > 1:
                issue('missing-or-duplicate-id', kind, index, 'ID')
            key = str(uuid.uuid5(uuid.NAMESPACE_URL, f'zyllen:skyline:v1:{kind}:{legacy_id}'))
            converted = {}
            target = mappings.get('records', {}).get(legacy_id, {}) if kind == 'registros' else {}
            if kind == 'registros':
                if similarities[tuple(normalized(row.get(field, '')) for field in ['Cliente', 'Cidade/UF', 'Serviço', 'Categoria', 'Início'])] > 1:
                    issue('possible-semantic-duplicate-review', kind, index)
                converted = {'service': SERVICES.get(normalized(row.get('Serviço', ''))),
                             'planning': {'stage': STAGES.get(normalized(row.get('Status', ''))), 'forecast': None},
                             'specifications': {'category': {'sala': 'sala', 'tela': 'tela'}.get(normalized(row.get('Categoria', ''))),
                                                'equipment': [x.strip() for x in re.split(r';|\n', row.get('Equipamentos', '')) if x.strip()],
                                                'room': {field: row.get(source, '') for field, source in [('roomType', 'Tipo de sala'), ('format', 'Formato'), ('proportion', 'Proporção'), ('resolution', 'Resolução'), ('projections', 'Projeções'), ('control', 'Totem ou tablet'), ('sound', 'Som')]}},
                             'legacyDates': {}, 'notes': row.get('Observação', '')}
                room_type = normalized(row.get('Tipo de sala', ''))
                converted['specifications']['room']['roomType'] = {'imersiva': 'imersiva', 'interativa': 'interativa', '': ''}.get(room_type)
                for field in ['Início', 'Fim', 'Data original', 'Previsão']:
                    try:
                        parsed = calendar_value(row.get(field, ''), monthly=field == 'Previsão')
                        converted['legacyDates'][field] = parsed
                        if field == 'Previsão':
                            converted['planning']['forecast'] = parsed
                    except ValueError:
                        issue('invalid-calendar-value', kind, index, field)
                start, end = converted['legacyDates'].get('Início'), converted['legacyDates'].get('Fim')
                if start and end and end < start:
                    issue('inverted-period', kind, index, 'Fim')
                if not converted['service'] or not converted['planning']['stage'] or not converted['specifications']['category'] or converted['specifications']['room']['roomType'] is None:
                    issue('unknown-classification', kind, index)
                for field in ['companyId', 'projectId', 'serviceId']:
                    try:
                        uuid.UUID(target.get(field, ''))
                    except (ValueError, AttributeError):
                        issue('missing-or-invalid-' + field, kind, index)
                if not target.get('address', '').strip():
                    issue('missing-address', kind, index)
                if row.get('Técnico', '').strip() and not target.get('assigneeIds'):
                    issue('unmapped-technician', kind, index)
                for assignee in target.get('assigneeIds', []):
                    try:
                        uuid.UUID(assignee)
                    except (ValueError, AttributeError):
                        issue('invalid-assignee-id', kind, index)
                if converted['planning']['stage'] == 'concluido':
                    issue('real-completion-not-provided', kind, index)
                if start:
                    issue('schedule-timezone-and-duration-not-approved', kind, index)
                if converted['service'] in ['REMOVAL', 'MAINTENANCE']:
                    issue('legacy-service-policy-not-approved', kind, index)
                if not row.get('Atualizado em') or not row.get('Atualizado por'):
                    issue('legacy-authorship-missing', kind, index)
            else:
                parent = row.get('Registro', '')
                converted = {'parentOriginKey': str(uuid.uuid5(uuid.NAMESPACE_URL, f'zyllen:skyline:v1:registros:{parent}'))}
                if parent not in all_records:
                    issue('orphan-parent', kind, index, 'Registro')
                if kind == 'pendencias':
                    try:
                        converted['deadline'] = calendar_value(row.get('Prazo', ''))
                    except ValueError:
                        issue('invalid-calendar-value', kind, index, 'Prazo')
                    if normalized(row.get('Situação', '')) not in ['aberta', 'resolvida']:
                        issue('unknown-pending-status', kind, index)
                    if not row.get('Criada em') or not row.get('Criada por'):
                        issue('legacy-authorship-missing', kind, index)
                    if normalized(row.get('Situação', '')) == 'resolvida' and (not row.get('Resolvida em') or not row.get('Resolvida por')):
                        issue('legacy-resolution-missing', kind, index)
                issue('historical-child-author-mapping-required', kind, index)
            staged.append({'originKey': key, 'collection': kind, 'legacyId': legacy_id, 'sourceHash': source_hash, 'payloadHash': digest(row), 'sourceData': row, 'converted': converted})
            plan.append({'originKey': key, 'collection': kind, 'target': target, 'status': 'blocked' if len(issues) > row_issues else 'requires-target-review', 'issueCodes': [item['code'] for item in issues[row_issues:]]})
    # Linking two legacy records to one operational service is never an implicit merge.
    linked = Counter(item['target'].get('serviceId') for item in plan if item['target'].get('serviceId'))
    for item in plan:
        if linked[item['target'].get('serviceId')] > 1:
            item['status'] = 'blocked'
            item['issueCodes'].append('duplicate-target-service')
            issues.append({'code': 'duplicate-target-service', 'collection': item['collection'], 'originKey': item['originKey']})
    summary = {'sourceHash': source_hash, 'totals': {kind: len(rows) for kind, rows in data.items()},
               'services': dict(Counter(row.get('Serviço', '') for row in data['registros'])), 'stages': dict(Counter(row.get('Status', '') for row in data['registros'])),
               'categories': dict(Counter(row.get('Categoria', '') for row in data['registros'])), 'issues': dict(Counter(item['code'] for item in issues)),
               'blocked': sum(item['status'] == 'blocked' for item in plan), 'executable': False}
    return staged, plan, issues, summary


def rehearse(rows, database):
    """Idempotent private SQLite staging; never writes to the operational database."""
    connection = sqlite3.connect(database)
    try:
        connection.execute('CREATE TABLE IF NOT EXISTS staging (origin_key TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, payload TEXT NOT NULL)')
        conflicts = []
        with connection:
            for row in rows:
                previous = connection.execute('SELECT payload_hash FROM staging WHERE origin_key=?', (row['originKey'],)).fetchone()
                if previous and previous[0] != row['payloadHash']:
                    conflicts.append(row['originKey'])
                else:
                    connection.execute('INSERT OR IGNORE INTO staging VALUES (?,?,?)', (row['originKey'], row['payloadHash'], json.dumps(row, ensure_ascii=False)))
        return {'staged': connection.execute('SELECT COUNT(*) FROM staging').fetchone()[0], 'sourceChangesRequiringReview': len(conflicts)}
    finally:
        connection.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--mappings', type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.parent != (ROOT / 'tmp').resolve():
        parser.error('Output must be a direct child directory of repository/tmp')
    data, source_hash = read_source(args.source.resolve())
    mappings = json.loads(args.mappings.read_text(encoding='utf-8-sig')) if args.mappings else {}
    rows, plan, issues, summary = prepare(data, source_hash, mappings)
    output.mkdir(parents=True, exist_ok=True)
    (output / '.gitignore').write_text('*\n', encoding='utf-8')
    first = rehearse(rows, output / 'staging.sqlite')
    second = rehearse(rows, output / 'staging.sqlite')
    if first != second:
        raise ValueError('Staging is not idempotent')
    summary['rehearsal'] = {**second, 'repeatedWithoutDuplicates': True}
    template = {'records': {row['legacyId']: {'companyId': '', 'projectId': '', 'serviceId': '', 'address': '', 'assigneeIds': []} for row in rows if row['collection'] == 'registros'}}
    for name, value in [('staging', rows), ('import-plan', plan), ('exceptions', issues), ('summary', summary), ('mapping-template', template)]:
        (output / f'{name}.json').write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == '__main__':
    main()
