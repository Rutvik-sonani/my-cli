const IRREGULAR_PLURALS: Record<string, string> = {
  person: 'people',
  child: 'children',
  man: 'men',
  woman: 'women',
  mouse: 'mice',
  goose: 'geese',
  tooth: 'teeth',
  foot: 'feet',
};

const IRREGULAR_SINGULARS: Record<string, string> = Object.fromEntries(
  Object.entries(IRREGULAR_PLURALS).map(([singular, plural]) => [plural, singular]),
);

export function kebabCase(input: string): string {
  return splitWords(input).join('-').toLowerCase();
}

export function camelCase(input: string): string {
  const words = splitWords(input);
  if (words.length === 0) {
    return '';
  }
  const [first = '', ...rest] = words;
  return first.toLowerCase() + rest.map(capitalize).join('');
}

export function pascalCase(input: string): string {
  return splitWords(input).map(capitalize).join('');
}

export function snakeCase(input: string): string {
  return splitWords(input).join('_').toLowerCase();
}

export function pluralize(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULAR_PLURALS[lower]) {
    return preserveCase(word, IRREGULAR_PLURALS[lower]!);
  }
  if (/(?:s|x|z|ch|sh)$/i.test(word)) {
    return `${word}es`;
  }
  if (/[^aeiou]y$/i.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }
  if (/f$/i.test(word)) {
    return `${word.slice(0, -1)}ves`;
  }
  if (/fe$/i.test(word)) {
    return `${word.slice(0, -2)}ves`;
  }
  return `${word}s`;
}

export function singularize(word: string): string {
  const lower = word.toLowerCase();
  if (IRREGULAR_SINGULARS[lower]) {
    return preserveCase(word, IRREGULAR_SINGULARS[lower]!);
  }
  if (/ies$/i.test(word)) {
    return `${word.slice(0, -3)}y`;
  }
  if (/(?:ses|xes|zes|ches|shes)$/i.test(word)) {
    return word.slice(0, -2);
  }
  if (/ves$/i.test(word)) {
    return `${word.slice(0, -3)}f`;
  }
  if (/s$/i.test(word) && !/ss$/i.test(word)) {
    return word.slice(0, -1);
  }
  return word;
}

function splitWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-./\\]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function capitalize(word: string): string {
  if (!word) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function preserveCase(original: string, transformed: string): string {
  if (original === original.toUpperCase()) {
    return transformed.toUpperCase();
  }
  if (original[0] === original[0]?.toUpperCase()) {
    return transformed.charAt(0).toUpperCase() + transformed.slice(1);
  }
  return transformed;
}
