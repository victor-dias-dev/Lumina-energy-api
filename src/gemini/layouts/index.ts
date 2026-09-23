import { ModelUnavailableError } from '../errors/extraction.errors';
import { BillLayout } from './bill-layout';
import { defaultLayout } from './default.layout';

const layouts = new Map<string, BillLayout>([
  [defaultLayout.id, defaultLayout],
]);

export function listLayouts(): string[] {
  return [...layouts.keys()];
}

export function getLayout(id = 'default'): BillLayout {
  const layout = layouts.get(id);
  if (!layout) {
    throw new ModelUnavailableError(
      `Layout desconhecido: ${id}. Disponíveis: ${listLayouts().join(', ')}`,
    );
  }
  return layout;
}

export type { BillLayout };
