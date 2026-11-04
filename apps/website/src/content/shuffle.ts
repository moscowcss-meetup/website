/** Перемешанная копия списка (Фишер — Йейтс): все порядки равновероятны, исходный список не меняется. */
export function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let last = result.length - 1; last > 0; last -= 1) {
    const other = Math.floor(random() * (last + 1));
    [result[last], result[other]] = [result[other] as T, result[last] as T];
  }
  return result;
}
