// Движение: длительности и кривые. Модуль без побочных эффектов — его читают и
// темы (.css.ts), и клиентские скрипты.
const contract = {
  motion: {
    duration: {
      fast: null,
      base: null,
      fall: null,
      spin: null,
    },
    easing: {
      standard: null,
      linear: null,
      fall: null,
      drop: null,
    },
  },
} as const;

const values = {
  motion: {
    duration: {
      fast: '120ms',
      base: '200ms',
      fall: '900ms',
      // Один оборот лоадера.
      spin: '800ms',
    },
    easing: {
      standard: 'cubic-bezier(0.2, 0, 0, 1)',
      linear: 'linear',
      // Значение 1.3 > 1 даёт отскок при падении плашек.
      fall: 'cubic-bezier(0.33, 1.3, 0.6, 1)',
      // Разгон без торможения: плашка проваливается вниз, как под своим весом.
      drop: 'cubic-bezier(0.55, 0, 1, 0.45)',
    },
  },
};

export const motion = { contract, values };
