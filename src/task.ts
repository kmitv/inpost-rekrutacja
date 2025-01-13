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

const parseOrder = (title: string, id: number): number => {
  if (title && title.includes(HOME_SYMBOL)) {
    title = title.split(HOME_SYMBOL)[0];
  }
  const order = parseInt(title);
  return isNaN(order) ? id : order;
};

const createNode = (
  item: Category,
  order: number,
  children: CategoryListElement[]
): CategoryListElement => {
  return {
    id: item.id,
    image: item.MetaTagDescription,
    name: item.name,
    order: order,
    children: children,
    showOnHome: false,
  };
};

const mapCategory = (
  category: Category,
  parentTitle: string
): CategoryListElement => {
  const order = parseOrder(category.Title || parentTitle, category.id);
  const children = category.children
    ? category.children.map((child) =>
        mapCategory(child, category.Title || parentTitle)
      )
    : [];
  return createNode(
    category,
    order,
    children.sort((a, b) => a.order - b.order)
  );
};

const processCategories = (
  categories: Category[]
): { categoryListElements: CategoryListElement[]; toShowOnHome: number[] } => {
  const toShowOnHome: number[] = [];
  const categoryListElements: CategoryListElement[] = categories
    .map((c1) => {
      const node = mapCategory(c1, c1.Title);
      if (c1.Title && c1.Title.includes(HOME_SYMBOL)) {
        toShowOnHome.push(c1.id);
      }
      return node;
    })
    .sort((a, b) => a.order - b.order);

  return {
    categoryListElements,
    toShowOnHome,
  };
};

export const categoryTree = async (
  getCategories: () => Promise<{ data: Category[] }>
): Promise<CategoryListElement[]> => {
  const categories = await getCategories();

  const { categoryListElements, toShowOnHome } = processCategories(
    categories.data
  );

  if (categoryListElements.length <= 5) {
    categoryListElements.forEach((a) => (a.showOnHome = true));
  } else if (toShowOnHome.length > 0) {
    categoryListElements.forEach(
      (x) => (x.showOnHome = toShowOnHome.includes(x.id))
    );
  } else {
    categoryListElements.forEach((x, index) => (x.showOnHome = index < 3));
  }

  return categoryListElements;
};

// TODO: 1. opisać ten refaktor
// TODO: 2. sprawdzić czy jest poprawny (chyba jest) ✅
// TODO: 3. ugenerycznić catetoryTree ✅
