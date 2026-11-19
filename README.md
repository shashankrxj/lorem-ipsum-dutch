# lorem-ipsum-dutch

Generate Dutch filler text for mockups, prototypes, and test data. Choose random words, sentences, or paragraphs from the bundled Dutch corpus, or provide your own vocabulary.

The generated text is Dutch-only, but random word combinations are not guaranteed to be grammatical or meaningful.

## Installation

```sh
npm install lorem-ipsum-dutch
```

Requires Node.js 18 or newer.

## Quick start

```js
const { LoremIpsum, loremIpsum } = require('lorem-ipsum-dutch');
const generator = new LoremIpsum();

console.log(loremIpsum({ count: 8, units: 'words' }));
console.log(loremIpsum({ count: 2, units: 'sentences' }));
console.log(generator.generateParagraph());

// Generate two paragraphs, separated by a blank line.
console.log(loremIpsum({ count: 2, units: 'paragraphs' }));
```

## API

### `loremIpsum(options)`

Returns generated text as a string.

| Option | Default | Description |
| --- | --- | --- |
| `count` | `1` | Number of units to generate; a non-negative integer. Zero returns an empty string. |
| `units` | `"sentences"` | `"words"`, `"sentences"`, or `"paragraphs"`. |
| `format` | `"plain"` | `"plain"` or `"html"`. HTML output is escaped and wrapped in `<p>` elements. |
| `sentenceLowerBound` | `5` | Minimum words per sentence; a positive integer. |
| `sentenceUpperBound` | `15` | Maximum words per sentence; must be at least the lower bound. |
| `paragraphLowerBound` | `3` | Minimum sentences per paragraph; a positive integer. |
| `paragraphUpperBound` | `7` | Maximum sentences per paragraph; must be at least the lower bound. |
| `words` | Bundled corpus | Optional non-empty array of non-empty vocabulary strings. |
| `random` | `Math.random` | Optional random function returning a number in `[0, 1)`. Takes precedence over `seed`. |
| `seed` | — | Optional finite number for repeatable pseudo-random output. |
| `avoidImmediateRepeats` | `false` | Avoid selecting the same word twice in a row when another unique word is available. |
| `suffix` | `"\n"` | String appended to non-empty output. |

Invalid options throw a `TypeError` or `RangeError` with a descriptive message.

### `LoremIpsum`

Create a generator with `new LoremIpsum(options)`. The class accepts `words`, `random`, `seed`, and `avoidImmediateRepeats`, plus these length settings:

- `wordsPerSentence: { min, max }` — defaults to `{ min: 5, max: 15 }`.
- `sentencesPerParagraph: { min, max }` — defaults to `{ min: 3, max: 7 }`.

Both boundaries must be positive integers, and `min` cannot exceed `max`. When both `random` and `seed` are provided, `random` takes precedence.

Methods:

- `generateWords(count)` — returns space-separated words.
- `generateSentence()` — returns one capitalized sentence ending in a full stop.
- `generateSentences(count)` — returns sentences separated by spaces.
- `generateParagraph()` — returns a paragraph containing a configured random number of sentences.
- `generateParagraphs(count)` — returns paragraphs separated by a blank line.
- `loadCorpus()` — returns the cleaned bundled vocabulary.

Counts must be non-negative integers. The bundled corpus is cached; custom vocabularies are kept separate.

## Examples

Use a custom Dutch vocabulary:

```js
const { loremIpsum } = require('lorem-ipsum-dutch');

const text = loremIpsum({
  count: 2,
  units: 'sentences',
  words: ['fiets', 'tulpen', 'grachten'],
});
```

Repeat output with a seed:

```js
const first = loremIpsum({ count: 3, units: 'sentences', seed: 12345 });
const again = loremIpsum({ count: 3, units: 'sentences', seed: 12345 });

console.log(first === again); // true
```

Set sentence and paragraph lengths, prevent immediate repeats, or request escaped HTML:

```js
const sentences = loremIpsum({
  count: 4,
  units: 'sentences',
  sentenceLowerBound: 3,
  sentenceUpperBound: 6,
});

const paragraphs = loremIpsum({
  count: 2,
  units: 'paragraphs',
  paragraphLowerBound: 2,
  paragraphUpperBound: 3,
  avoidImmediateRepeats: true,
});

const html = loremIpsum({ count: 1, units: 'paragraphs', format: 'html' });
```

## Limitations

The bundled vocabulary comes from a historical Dutch text corpus; it is not a general-purpose dictionary. Generated sentences and paragraphs are random filler text and are not guaranteed to be grammatical or meaningful Dutch.

## License

MIT. See [LICENSE](LICENSE).
