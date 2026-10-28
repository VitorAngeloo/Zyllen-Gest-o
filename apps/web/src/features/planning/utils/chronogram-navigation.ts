import { CHRONOGRAM_SERVICES, CHRONOGRAM_STAGES, CHRONOGRAM_VIEWS } from '../chronogram.constants';
import type { ChronogramFilters, ChronogramView } from '../types/chronogram.types';
import { defaultFilters } from './chronogram-dates';

export function readChronogramLocation(pathname: string, params: URLSearchParams, now: Date) {
    const oldSection = params.get('aba');
    const section = pathname === '/dashboard/viagens' || oldSection === 'viagens' ? 'viagens' : 'cronograma';
    const requested = params.get('visao');
    const legacyAgenda = pathname === '/dashboard/agenda' || oldSection === 'agenda';
    let view: ChronogramView = CHRONOGRAM_VIEWS.some(item => item.id === requested) ? requested as ChronogramView : 'agenda';
    if (requested === 'lista') view = 'agenda';
    else if (!requested && legacyAgenda) view = pathname === '/dashboard/agenda' ? 'agenda' : 'calendario';
    else if (oldSection === 'projetos' || pathname === '/dashboard/projetos/estruturas') view = 'projetos';
    const defaults = defaultFilters(now);
    const year = Number(params.get('ano'));
    const month = params.get('mes');
    const category = params.get('categoria'), service = params.get('servico'), stage = params.get('status');
    const filters: ChronogramFilters = { ...defaults,
        year: Number.isInteger(year) && year >= 1970 && year <= 9999 ? year : defaults.year,
        month: month === 'all' ? 'all' : month !== null && /^\d+$/.test(month) && Number(month) < 12 ? Number(month) : defaults.month,
        category: category === 'sala' || category === 'tela' || category === 'unknown' ? category : 'all',
        service: service && Object.hasOwn(CHRONOGRAM_SERVICES, service) ? service as ChronogramFilters['service'] : 'all',
        stage: stage && Object.hasOwn(CHRONOGRAM_STAGES, stage) ? stage as ChronogramFilters['stage'] : 'all',
        state: /^[A-Z]{2}$/.test(params.get('uf') ?? '') ? params.get('uf')! : 'all', search: (params.get('busca') ?? '').slice(0, 200),
    };
    return { section, view, filters, history: params.get('historico') === '1' || pathname === '/dashboard/projetos/estruturas' };
}
export function chronogramUrl(section: string, view: ChronogramView, filters: ChronogramFilters, history = false) {
    const query = new URLSearchParams({ aba: section, visao: view, ano: String(filters.year), mes: String(filters.month) });
    if (filters.category !== 'all') query.set('categoria', filters.category);
    if (filters.service !== 'all') query.set('servico', filters.service);
    if (filters.stage !== 'all') query.set('status', filters.stage);
    if (filters.state !== 'all') query.set('uf', filters.state);
    if (filters.search) query.set('busca', filters.search);
    if (history) query.set('historico', '1');
    return `/dashboard/projetos?${query}`;
}
