'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LoremIpsum, loremIpsum } = require('../loremIpsum');

test('exports preserve the CommonJS public API', () => {
  assert.deepEqual(Object.keys(require('../loremIpsum')).sort(), ['LoremIpsum', 'loremIpsum']);
  assert.equal(typeof LoremIpsum, 'function');
  assert.equal(typeof loremIpsum, 'function');
  for (const method of ['generateWords', 'generateSentence', 'generateSentences', 'generateParagraph', 'generateParagraphs']) {
    assert.equal(typeof new LoremIpsum({ words: ['hond'], wordsPerSentence: { min: 1, max: 1 }, sentencesPerParagraph: { min: 1, max: 1 } })[method], 'function');
  }
});

test('generates requested word, sentence, paragraph and multiple paragraph counts', () => {
  const words = ['fiets', 'boom', 'water'];
  const generator = new LoremIpsum({ words, wordsPerSentence: { min: 2, max: 2 }, sentencesPerParagraph: { min: 2, max: 2 }, random: () => 0 });
  assert.equal(generator.generateWords(3).split(' ').length, 3);
  assert.equal(generator.generateSentence().split(' ').length, 2);
  assert.equal(generator.generateSentences(3).split(/(?<=\.) /u).length, 3);
  assert.equal(generator.generateParagraph().split(/(?<=\.) /u).length, 2);
  assert.equal(generator.generateParagraphs(2).split('\n\n').length, 2);
});

test('sentence generation samples one word sequence and normalizes punctuation', () => {
  const generator = new LoremIpsum({ words: ['woord!'], wordsPerSentence: { min: 1, max: 1 }, random: () => 0 });
  assert.equal(generator.generateSentence(), 'Woord.');
  assert.equal(new LoremIpsum({ words: ['ijzer'], wordsPerSentence: { min: 1, max: 1 }, random: () => 0 }).generateSentence(), 'Ijzer.');
  assert.equal(new LoremIpsum({ words: ['...boom?!'], wordsPerSentence: { min: 1, max: 1 }, random: () => 0 }).generateSentence(), 'Boom.');
});

test('sentence and paragraph bounds are respected', () => {
  const text = loremIpsum({ count: 4, units: 'paragraphs', words: ['maan'], seed: 7, sentenceLowerBound: 2, sentenceUpperBound: 4, paragraphLowerBound: 3, paragraphUpperBound: 5 });
  for (const paragraph of text.trim().split(/\n\n/u)) {
    const sentences = paragraph.split(/(?<=\.) /u);
    assert.ok(sentences.length >= 3 && sentences.length <= 5);
    for (const sentence of sentences) {
      const count = sentence.replace(/\.$/u, '').split(/\s+/u).length;
      assert.ok(count >= 2 && count <= 4);
    }
  }
});

test('corpus cleaning removes page references, numeric and formatting artifacts and preserves Dutch diacritics', () => {
  const vocabulary = new LoremIpsum().options.words;
  assert.ok(vocabulary.includes('Israëls'));
  assert.ok(vocabulary.every((token) => token && !/^\d+$/u.test(token) && !/^\[p\.?\d+\]$/iu.test(token) && !/^[*_=~–—-]+$/u.test(token)));
});

test('immediate repetition can be prevented without rejecting a one-word vocabulary', () => {
  const generator = new LoremIpsum({ words: ['fiets', 'boom'], avoidImmediateRepeats: true, random: () => 0 });
  assert.equal(generator.generateWords(4), 'fiets boom fiets boom');
  assert.equal(new LoremIpsum({ words: ['fiets'], avoidImmediateRepeats: true, random: () => 0 }).generateWords(3), 'fiets fiets fiets');
});

test('seeded generation is deterministic and custom random takes precedence', () => {
  const options = { count: 3, units: 'sentences', words: ['appel', 'peer', 'kers'], seed: 12345, sentenceLowerBound: 3, sentenceUpperBound: 3 };
  assert.equal(loremIpsum(options), loremIpsum(options));
  assert.notEqual(loremIpsum({ ...options, seed: 12346 }), loremIpsum(options));
  assert.equal(loremIpsum({ ...options, random: () => 0 }), loremIpsum({ ...options, random: () => 0, seed: 999 }));
  assert.equal(new LoremIpsum({ words: ['peer'], seed: 2 }).generateWords(2), 'peer peer');
});

test('custom random works and invalid random outputs fail', () => {
  assert.equal(loremIpsum({ count: 2, units: 'words', words: ['aap', 'noot'], random: () => 0.99 }), 'noot noot\n');
  assert.throws(() => loremIpsum({ count: 1, units: 'words', words: ['aap'], random: () => 1 }), /range \[0, 1\)/u);
  assert.throws(() => new LoremIpsum({ random: 'random' }), /random must be a function/u);
  for (const value of [-0.01, 1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => new LoremIpsum({ words: ['aap'], random: () => value }).generateWords(1), /range \[0, 1\)/u);
  }
});

test('validates count, units, format, boundaries and vocabulary', () => {
  assert.equal(loremIpsum({ count: 0, suffix: 'ignored' }), '');
  for (const count of [-1, 1.5, '2']) assert.throws(() => loremIpsum({ count }), /non-negative integer/u);
  assert.throws(() => loremIpsum({ units: 'letters' }), /units must be/u);
  assert.throws(() => loremIpsum({ format: 'xml' }), /format must be/u);
  assert.throws(() => loremIpsum({ sentenceLowerBound: 8, sentenceUpperBound: 2 }), /minimum must not exceed/u);
  assert.throws(() => loremIpsum({ paragraphLowerBound: 0 }), /at least 1/u);
  assert.throws(() => new LoremIpsum({ words: [] }), /non-empty array/u);
  assert.throws(() => new LoremIpsum({ words: ['  '] }), /non-empty strings/u);
  assert.throws(() => new LoremIpsum({ words: [null] }), /non-empty strings/u);
  assert.throws(() => new LoremIpsum({ seed: Number.NaN }), /seed must be a finite number/u);
  assert.throws(() => new LoremIpsum({ wordsPerSentence: { min: 4, max: 2 } }), /minimum must not exceed maximum/u);
  assert.throws(() => new LoremIpsum({ sentencesPerParagraph: { min: 0, max: 2 } }), /at least 1/u);
  assert.throws(() => loremIpsum({ suffix: 123 }), /suffix must be a string/u);
  const generator = new LoremIpsum({ words: ['woord'] });
  for (const method of ['generateWords', 'generateSentences', 'generateParagraphs']) {
    assert.throws(() => generator[method](-1), /non-negative integer/u);
  }
});

test('zero count is empty for each unit and format', () => {
  for (const units of ['words', 'sentences', 'paragraphs']) {
    for (const format of ['plain', 'html']) {
      assert.equal(loremIpsum({ count: 0, units, format, suffix: 'tail' }), '');
    }
  }
  assert.equal(new LoremIpsum({ words: ['woord'] }).generateWords(0), '');
});

test('custom vocabulary is used and stays independent between instances', () => {
  const first = new LoremIpsum({ words: ['fiets'], random: () => 0 });
  const second = new LoremIpsum({ words: ['boom'], random: () => 0 });
  assert.equal(first.generateWords(2), 'fiets fiets');
  assert.equal(second.generateWords(2), 'boom boom');
  assert.notStrictEqual(first.options.words, second.options.words);
});

test('minimum and maximum configured lengths are both reachable', () => {
  const minimum = loremIpsum({ count: 1, units: 'sentences', words: ['een', 'twee'], sentenceLowerBound: 2, sentenceUpperBound: 4, random: () => 0 });
  const maximum = loremIpsum({ count: 1, units: 'sentences', words: ['een', 'twee'], sentenceLowerBound: 2, sentenceUpperBound: 4, random: () => 0.999999 });
  assert.equal(minimum.trim().replace(/\.$/u, '').split(' ').length, 2);
  assert.equal(maximum.trim().replace(/\.$/u, '').split(' ').length, 4);
  const paragraph = loremIpsum({ count: 1, units: 'paragraphs', words: ['een'], sentenceLowerBound: 1, sentenceUpperBound: 1, paragraphLowerBound: 2, paragraphUpperBound: 4, random: () => 0 });
  assert.equal(paragraph.trim().split(/(?<=\.) /u).length, 2);
});

test('HTML output escapes custom vocabulary and retains paragraphs', () => {
  const html = loremIpsum({ count: 2, units: 'paragraphs', format: 'html', words: ['tekst&meer'], sentenceLowerBound: 1, sentenceUpperBound: 1, paragraphLowerBound: 1, paragraphUpperBound: 1, random: () => 0 });
  assert.match(html, /^<p>/u);
  assert.equal((html.match(/<p>/gu) || []).length, 2);
  assert.match(html, /&amp;/u);
  const sensitive = loremIpsum({ count: 1, units: 'words', format: 'html', words: [`A<&"'`], random: () => 0 });
  assert.match(sensitive, /A&lt;&amp;&quot;&#39;/u);
  const malicious = loremIpsum({ count: 1, units: 'words', format: 'html', words: ['<script>alert(1)</script>'] });
  assert.doesNotMatch(malicious, /<script>/iu);
});

test('default corpus is cached across instances', () => {
  const first = new LoremIpsum();
  const second = new LoremIpsum();
  assert.strictEqual(first.options.words, second.options.words);
  assert.strictEqual(first.loadCorpus(), second.loadCorpus());
  assert.ok(Object.isFrozen(first.options.words));
});
