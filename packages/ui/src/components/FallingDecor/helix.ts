/**
 * Пружинка как настоящая спираль в 3D, спроецированная на экран. Формы макета — именно такая проекция:
 * x = R·cos(a), y = шаг·виток + наклон·sin(a). Прибавляя к углу фазу, мы вращаем спираль вокруг оси,
 * и концы пружинки ходят по кругу, как у серпантина.
 */
export interface HelixShape {
  /** Радиус витка */
  radius: number;
  /** Расстояние между витками вдоль оси */
  pitch: number;
  /** На сколько виток виден сверху: половина высоты его эллипса */
  tilt: number;
  /** Число витков */
  turns: number;
}

// Размеры сняты с пружинок макета; цвета идут в том же порядке в FallingDecor.css.ts.
export const helixShapes: readonly HelixShape[] = [
  { radius: 50, pitch: 25.144, tilt: 15.5, turns: 7.5 },
  { radius: 26, pitch: 18.181, tilt: 11.2, turns: 7.5 },
  { radius: 89.5, pitch: 63.311, tilt: 39, turns: 7.5 },
];

const STEPS_PER_TURN = 24;
const MARGIN = 2;
const TAU = Math.PI * 2;

export interface HelixBox {
  width: number;
  height: number;
}

/** Размер кадра, в который пружинка помещается при любой фазе. */
export function helixBox({ radius, pitch, tilt, turns }: HelixShape): HelixBox {
  return {
    width: 2 * (radius + MARGIN),
    height: pitch * turns + 2 * (tilt + MARGIN),
  };
}

export interface HelixPaths {
  /** Часть спирали, обращённая к зрителю */
  front: string;
  /** Часть спирали за осью, её рисуют бледнее */
  back: string;
}

/** Контуры SVG для пружинки, повёрнутой на `phase` радиан вокруг своей оси. */
export function helixPaths(shape: HelixShape, phase: number): HelixPaths {
  const { radius, pitch, tilt, turns } = shape;
  const box = helixBox(shape);
  const steps = Math.ceil(turns * STEPS_PER_TURN);
  const parts = { front: '', back: '' };
  let previous: 'front' | 'back' | undefined;
  let lastPoint = '';

  for (let step = 0; step <= steps; step += 1) {
    const turn = (step / steps) * turns;
    const angle = turn * TAU + phase;
    const x = box.width / 2 + radius * Math.cos(angle);
    const y = MARGIN + tilt + pitch * turn + tilt * Math.sin(angle);
    const point = `${x.toFixed(1)} ${y.toFixed(1)}`;
    const side = Math.sin(angle) >= 0 ? 'front' : 'back';
    // На смене стороны продолжаем с прошлой точки: иначе в линии виден разрыв.
    if (side !== previous) parts[side] += `M${lastPoint || point}`;
    parts[side] += `L${point}`;
    previous = side;
    lastPoint = point;
  }
  return parts;
}
