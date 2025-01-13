import test from 'ava';

import { CORRECT } from './correctResult';
import { getCategories } from './mockedApi';
import { categoryTree } from './task';

test('categoryTree should correctly map categories to a tree structure', async (t) => {
  const result = await categoryTree(getCategories);
  t.deepEqual(result, CORRECT);
});
