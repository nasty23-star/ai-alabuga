export interface GlossaryEntry {
  key: string;
  title: string;
  en: string;
  text: string;
}

export const GLOSSARY_MVP: GlossaryEntry[] = [
  {
    key: "filler_density",
    title: "Слова-паразиты",
    en: "Filler Density",
    text: "Доля «ну», «как бы», «типа», «короче», «в общем» среди всех твоих слов",
  },
  {
    key: "open_question_ratio",
    title: "Вопросы, чтобы получить информацию",
    en: "Open Question Ratio",
    text: "Доля открытых вопросов («почему», «как», «что для вас важно») среди всех твоих вопросов",
  },
  {
    key: "concession_discipline",
    title: "Уступки собеседнику",
    en: "Concession Discipline",
    text: "Доля уступок, сделанных в обмен на что-то. 10 — ни одной уступки просто так",
  },
  {
    key: "own_outcome",
    title: "Выгодность сделки",
    en: "Own Outcome",
    text: "Насколько итог хорош по твоим приоритетам из мастера: 0 — твоя граница, 10 — идеал",
  },
  {
    key: "batna_gain",
    title: "Выгодность альтернативной сделки",
    en: "BATNA Gain",
    text: "Насколько сделка лучше плана Б по шкале от 0 до 10. Только если план Б задан числом",
  },
  {
    key: "objection_recognition",
    title: "Реакция на возражения",
    en: "Objection Recognition",
    text: "Доля возражений собеседника, на которые ты отреагировал, а не пропустил",
  },
  {
    key: "reservation_point_discipline",
    title: "Согласие на невыгодные условия",
    en: "Reservation Point Discipline",
    text: "Не согласился ли ты на условия хуже своей границы: да или нет",
  },
  {
    key: "information_gathering",
    title: "Выясненные неизвестные факты",
    en: "Information Gathering",
    text: "Доля скрытых фактов сценария, которые ты выяснил",
  },
  {
    key: "objective_criteria",
    title: "Аргументы",
    en: "Objective Criteria",
    text: "Опирался ли на рыночную цену, регламент, прецедент — вместо «я так хочу»",
  },
];

export const GLOSSARY_DERIVED: { title: string; text: string }[] = [
  {
    title: "Итоговый балл",
    text: "среднее числовых метрик по шкале от 0 до 10. 0 — граница, 10 — идеал.",
  },
  {
    title: "Топ-3 зоны роста",
    text: "три метрики, сильнее всего отстающие от порога. С них начинается разбор.",
  },
];

export const GLOSSARY_PLANNED: { title: string; en: string }[] = [
  { title: "Баланс речи", en: "Talk/Listen Ratio" },
  { title: "Самый длинный монолог", en: "Longest Monologue" },
  { title: "Скорость ответа", en: "Response Latency" },
];
