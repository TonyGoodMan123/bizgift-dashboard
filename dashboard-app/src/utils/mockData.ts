// Mock data generator for development without backend

import type { Deal, KpiActivity, Manager } from '../types/api';

const MANAGERS_LIST: Manager[] = [
    { manager_id: 1, manager_name: 'Алексей Смирнов', avatar_color: 'bg-blue-500', is_active: true },
    { manager_id: 2, manager_name: 'Мария Иванова', avatar_color: 'bg-emerald-500', is_active: true },
    { manager_id: 3, manager_name: 'Дмитрий Петров', avatar_color: 'bg-purple-500', is_active: true },
    { manager_id: 4, manager_name: 'Елена Соколова', avatar_color: 'bg-amber-500', is_active: true },
];

const STAGES = [
    'Новая заявка', 'Потребность выявлена', 'КП отправлено',
    'КП на рассмотрении', 'КП согласовано', 'Договор/Счет отправлен',
    'Договор/Счет предоплачен', 'Сделка успешна'
] as const;

export function generateMockData() {
    const deals: Deal[] = [];
    const kpi: Record<number, KpiActivity> = {};

    MANAGERS_LIST.forEach((m) => {
        kpi[m.manager_id] = {
            manager_id: m.manager_id, manager_name: m.manager_name,
            calls_30_sec_count: Math.floor(Math.random() * 800) + 200,
            offers_sent_count: Math.floor(Math.random() * 40) + 10,
            needs_count: Math.floor(Math.random() * 50) + 10,
            offers_agreed_count: Math.floor(Math.random() * 10),
        };
    });

    const startDate = new Date(2025, 8, 1);
    const endDate = new Date(2025, 10, 25);
    const timeDiff = endDate.getTime() - startDate.getTime();

    for (let i = 0; i < 600; i++) {
        const manager = MANAGERS_LIST[Math.floor(Math.random() * MANAGERS_LIST.length)];
        const isSuccess = Math.random() > 0.6;
        const isLost = !isSuccess && Math.random() > 0.4;
        let stage: Deal['stage'] = isSuccess ? 'Сделка успешна' : isLost ? 'Провал' : STAGES[Math.floor(Math.random() * (STAGES.length - 1))];
        const amount = Math.floor(Math.random() * 450000) + 50000;
        const marginPercent = 0.2 + Math.random() * 0.25;
        const cost = amount * (1 - marginPercent);
        const dealDate = new Date(startDate.getTime() + Math.random() * timeDiff);
        const cycleDays = Math.floor(Math.random() * 28) + 2;
        const closeDate = new Date(dealDate.getTime() + cycleDays * 86400000).toISOString().split('T')[0];
        const stageDurations: Record<string, number> = {};
        const currentStageIdx = STAGES.indexOf(stage === 'Провал' ? 'Новая заявка' : stage);
        STAGES.forEach((s, idx) => {
            if (idx <= currentStageIdx || stage === 'Сделка успешна') {
                stageDurations[s] = idx < 2 ? Math.floor(Math.random() * 3) + 1 : idx < 5 ? Math.floor(Math.random() * 7) + 2 : Math.floor(Math.random() * 5) + 1;
            }
        });
        deals.push({
            deal_id: `D-${2000 + i}`, deal_name: `Заказ #${2000 + i}`,
            manager_id: manager.manager_id, manager_name: manager.manager_name, stage,
            created_at: dealDate.toISOString().split('T')[0],
            closed_at: isSuccess ? closeDate : null, lost_at: isLost ? closeDate : null,
            amount: Math.floor(amount), cost: Math.floor(cost),
            margin_value: Math.floor(amount - cost), margin_percent: marginPercent,
            source: Math.random() > 0.5 ? 'Входящий звонок' : 'Сайт',
            kp_date: stage !== 'Новая заявка' ? dealDate.toISOString().split('T')[0] : null,
            kp_approved_date: currentStageIdx >= 4 ? closeDate : null,
            payment_confirmed: isSuccess, payment_date: isSuccess ? closeDate : null,
            payment_ratio: isSuccess ? (Math.random() > 0.3 ? 1.0 : 0.5) : 0,
            stage_durations: stageDurations,
        });
    }
    return { managers: MANAGERS_LIST, deals, kpi };
}
