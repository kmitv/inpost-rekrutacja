import { INPUT } from './input';

export interface Category {
  id: number;
  name: string;
  hasChildren: boolean;
  url: string;
  Title: string;
  MetaTagDescription: string;
  children: Category[];
}

export const getCategories = async (): Promise<{ data: Category[] }> => ({
  data: INPUT,
});
