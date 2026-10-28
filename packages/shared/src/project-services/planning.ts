import { z } from 'zod';

export const PROJECT_PLANNING_STAGES = ['contrato', 'kickoff', 'semprev', 'predef', 'agendado', 'pausado', 'concluido', 'cancelado'] as const;
export type ProjectPlanningStage = (typeof PROJECT_PLANNING_STAGES)[number];
export const PROJECT_PLANNING_STAGE_LABELS: Record<ProjectPlanningStage, string> = {
    contrato: 'Aguardando contrato', kickoff: 'Aguardando kickoff', semprev: 'Sem previsão', predef: 'Data pré-definida',
    agendado: 'Agendado por e-mail', pausado: 'Pausado', concluido: 'Concluído', cancelado: 'Cancelado',
};

/** A forecast is a calendar value, never an instant or proof of execution. */
export const projectForecastSchema = z.string().regex(/^\d{4}-\d{2}(?:-\d{2})?$/, 'Informe a previsão como AAAA-MM ou AAAA-MM-DD')
    .refine(value => {
        const [year, month, day] = value.split('-').map(Number);
        if (year < 1970 || year > 9999 || month < 1 || month > 12) return false;
        const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
        return day === undefined || day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    }, 'Informe um mês ou dia válido entre 1970 e 9999');

export const projectPlanningSchema = z.object({
    stage: z.enum(PROJECT_PLANNING_STAGES).nullable(),
    forecast: projectForecastSchema.nullable(),
}).strict();
export type ProjectPlanning = z.infer<typeof projectPlanningSchema>;
