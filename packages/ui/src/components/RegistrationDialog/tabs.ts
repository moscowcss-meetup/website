/**
 * Индекс вкладки после нажатия клавиши в списке вкладок (шаблон WAI-ARIA Tabs): стрелки идут по кругу,
 * Home и End — к краям. Для прочих клавиш — `undefined`, их обрабатывать не нужно.
 */
export function tabIndexAfterKey(key: string, current: number, count: number): number | undefined {
  if (count <= 0) return undefined;
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return undefined;
  }
}
