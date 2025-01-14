
# Na czym polegają zmiany?

Przede wszystkim na stworzeniu testu (`task.test.ts`), dzięki któremu sprawdzam, czy dane przetworzone przez funkcję `categoryTree` zgadzają się z przykładowymi, poprawnymi zmianami z pliku `correctResults.ts`. Test jest uruchamiany wraz z skryptem `test` - obecnie "u mnie działa" 🙃.

Zmiany postarałem się opisać dokładniej poniżej, przede wszyskim zależało mi na podzieleniu istniejącej logiki i po wyizolowaniu funkcji nazywaniu ich per rola w interesującej nas funkcji głównej (`categoryTree`). Dosyć znaczącą zmianą wydaje mi się również użycie mapowania rekurencyjnego zamiast wywoływania mapowania wprost na poszczególnych poziomach - moim zdaniem logika zyskuje tym samym na uniwersalności i skalowalności. 

Miałbym również nadzieję, że takie zmiany w sytuacji nieco bardziej produkcyjnej doprowadziłyby do łatwiejszego utrzymania, zrozumienia przez inne osoby utrzymujące kod lub przynajmniej byłyby przyczynkiem do dalszego usprawniania.

# Podsumowanie zmian

## 1. Rozbicie logiki na mniejsze funkcje i pliki

### **Wersja przed:**  
Wszystko działo się w jednej, długiej funkcji `categoryTree`. Wewnątrz niej były zarówno:
- Pobranie danych (wywołanie `getCategories()`),
- Mapowanie i parsowanie wartości `Title` w celu ustalenia pola `order`,
- Rekursywne przejście po dzieciach,
- Ustalanie, które kategorie powinny zostać oznaczone jako `showOnHome`.

### **Wersja po:**  
Kod został podzielony na mniejsze elementy:

1. **`parseOrder(...)`** – osobna funkcja wyciągająca liczbę `order` z pola `Title`.  
2. **`createNode(...)`** – funkcja, która z obiektu typu `Category` (pochodzącego z fejkowego API) tworzy obiekt typu `CategoryListElement`.  
3. **`mapCategory(...)`** – funkcja pomocnicza, która w sposób rekurencyjny mapuje pojedynczą kategorię (oraz jej dzieci) na docelową strukturę.  
4. **`processCategories(...)`** – funkcja, która zbiera i sortuje wszystkie kategorie w ostateczną listę, a także ustala, czy dana kategoria ma zostać oznaczona jako `showOnHome`.  
5. **`categoryTree(...)`** – główna funkcja eksportowana, która przyjmuje w parametrze funkcję pobierającą dane (`getCategories`), wywołuje ją i przekazuje do `processCategories`, zwracając końcowy rezultat.

Dzięki temu kod jest czytelniejszy i łatwiej go utrzymywać.

---

## 2. Zmiana sposobu parsowania i sortowania (`Title` -> `order`)

### **Wersja przed:**  
W starym kodzie często pojawiał się błąd, polegający na tym, że na poziomie dzieci (drugim i trzecim) do parsowania `order` używane było **`c1.Title`** (czyli tytuł rodzica zamiast tytułu dziecka).  
Przykładowo:
```ts
let order2 = c1.Title; // zamiast c2.Title
...
let order3 = c1.Title; // zamiast c3.Title
```
To powodowało nieprawidłowe określenie kolejności (sortowania) w strukturze drzewa.

### **Wersja po:**  
- Wprowadzona została stała `HOME_SYMBOL = '#'` – dzięki temu w kodzie jest jasno zaznaczone, że znak `#` w tytule jest dla nas istotny.  
- Funkcja **`parseOrder(title: string, id: number): number`** przyjmuje tytuł (opcjonalnie z symbolem `#`) oraz zapasowy `id`. Jeżeli w tytule znajduje się `#`, to rozdzielamy go i bierzemy liczbę z lewej strony. Jeśli z jakiegoś powodu nie jest to poprawna liczba (lub `title` jest puste), wówczas `order = id`.  
- Dla **każdego** poziomu w drzewie wywołuje się `parseOrder(category.Title || parentTitle, category.id)`, dzięki czemu dzieci (i wnuki) używają już własnego `Title`, a jeśli go nie mają – wówczas fallbackiem może być tytuł rodzica (a przynajmniej to jest obrana przeze mnie droga).  

Skutek jest taki, że na poziomie L2 i L3 nie ma już błędu z korzystaniem zawsze z `Title` rodzica.

---

## 3. Funkcja `createNode(...)` do budowy obiektu wyjściowego

### **Wersja przed:**  
Struktura docelowa (`CategoryListElement`) była tworzona inline w wielu miejscach, np.:
```ts
return {
  id: c3.id,
  image: c3.MetaTagDescription,
  name: c3.name,
  order: orderL3,
  children: [],
  showOnHome: false,
};
```

### **Wersja po:**  
Została wyodrębniona funkcja:  
```ts
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
```
Dzięki temu nadawanie `id`, `image`, `name`, `order`, `children` i domyślnej wartości `showOnHome` jest jasno wyizolowane.

---

## 4. Rekurencyjne mapowanie w `mapCategory(...)`

### **Wersja przed:**  
Na każdym poziomie (L1, L2, L3) powtarzana była podobna logika:  
- Wyłuskanie i parsowanie `order`,  
- Tworzenie obiektu wynikowego,  
- Sortowanie dzieci.

### **Wersja po:**  
Zamiast kilkukrotnie duplikować kod, mamy jedną funkcję `mapCategory(...)`, która:
1. Wylicza `order` przez `parseOrder(...)`.  
2. Mapuje dzieci (rekurencyjnie odwołując się do `mapCategory(...)`).  
3. Sortuje zmapowane dzieci po `order`.  
4. Woła `createNode(...)`, tworząc ostateczny obiekt `CategoryListElement`.  

```ts
const mapCategory = (category: Category, parentTitle: string) => {
  const order = parseOrder(category.Title || parentTitle, category.id);
  const children = category.children
    ? category.children.map((child) =>
        mapCategory(child, category.Title || parentTitle)
      )
    : [];
  return createNode(category, order, children.sort((a, b) => a.order - b.order));
};
```

Dzięki temu mamy uniwersalną i czytelną obsługę dowolnego poziomu zagłębień w drzewie.

---

## 5. Obsługa `showOnHome` w `processCategories(...)`

### **Wersja przed:**  
W starym kodzie zbierane były identyfikatory do `toShowOnHome` i w zależności od stanu pętli decydowano, które elementy mają mieć `showOnHome = true`.

```ts
if (result.length <= 5) {
  ...
} else if (toShowOnHome.length > 0) {
  ...
} else {
  ...
}
```

### **Wersja po:**  
Zdecydowałem się w `processCategories(...)` na uproszczenie tej logiki (ponieważ nie zbieram już identyfikatorów `toShowOnHome`):
```ts
const categoryListElements = categories
  .map((c1, index, arr) => {
    const node = mapCategory(c1, c1.Title);
    const shouldShowOnHome = c1.Title && c1.Title.includes(HOME_SYMBOL);
    node.showOnHome = arr.length <= 5 || shouldShowOnHome || index < 3;
    return node;
  })
  .sort((a, b) => a.order - b.order);
```
Logika sprawdza:

- Jeśli `arr.length <= 5`, to wszystkie kategorie z automatu będą miały `showOnHome = true`.  
- Jeśli `Title` danej kategorii zawiera `HOME_SYMBOL` (czyli `#`), to `showOnHome = true`.  
- W pozostałych przypadkach `showOnHome` dostają (póki co) trzy pierwsze kategorie.  

Na końcu całość jest sortowana po `order`.