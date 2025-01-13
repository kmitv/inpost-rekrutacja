import { Category } from './mockedApi';

export interface CategoryListElement {
  name: string;
  id: number;
  image: string;
  order: number;
  children: CategoryListElement[];
  showOnHome: boolean;
}

const HOME_SYMBOL = '#';

function parseOrder(title: string, id: number): number {
  if (title && title.includes(HOME_SYMBOL)) {
    title = title.split(HOME_SYMBOL)[0];
  }
  const order = parseInt(title);
  return isNaN(order) ? id : order;
}

function createNode(item, order, children) {
  return {
    id: item.id,
    image: item.MetaTagDescription,
    name: item.name,
    order: order,
    children: children,
    showOnHome: false,
  };
}

function mapChildren(children, parentTitle) {
  return children
    .map((child) => {
      const order = parseOrder(child.Title || parentTitle, child.id);
      const grandChildren = child.children
        ? mapChildren(child.children, child.Title || parentTitle)
        : [];
      return createNode(child, order, grandChildren);
    })
    .sort((a, b) => a.order - b.order);
}

export const categoryTree = async (
  getCategories: () => Promise<{ data: Category[] }>
): Promise<CategoryListElement[]> => {
  const categories = await getCategories();
  const toShowOnHome: number[] = [];

  const result = categories.data
    .map((c1) => {
      const orderL1 = parseOrder(c1.Title, c1.id);
      if (c1.Title && c1.Title.includes(HOME_SYMBOL)) {
        toShowOnHome.push(c1.id);
      }
      const l2Children = c1.children ? mapChildren(c1.children, c1.Title) : [];
      return createNode(c1, orderL1, l2Children);
    })
    .sort((a, b) => a.order - b.order);

  if (result.length <= 5) {
    result.forEach((a) => (a.showOnHome = true));
  } else if (toShowOnHome.length > 0) {
    result.forEach((x) => (x.showOnHome = toShowOnHome.includes(x.id)));
  } else {
    result.forEach((x, index) => (x.showOnHome = index < 3));
  }

  return result;
};

// TODO: 1. opisać ten refaktor
// TODO: 2. sprawdzić czy jest poprawny
