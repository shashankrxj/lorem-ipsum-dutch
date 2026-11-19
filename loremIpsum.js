'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CORPUS_PATH = path.join(__dirname, 'corpus.txt');
let defaultVocabulary;

function cleanCorpus(text) {
  return text
    .replace(/\[(?:p\.?\s*)?\d+\]/gi, ' ')
    .replace(/(?:\*\s*){3,}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r?\n/g, ' ')
    .split(/\s+/u)
    .map((token) => token.replace(/^["“”([{.,;:!?…]+|["“”.,;:!?…)}\]]+$/gu, ''))
    .filter((token) => token && !/^\d+$/u.test(token) && !/^[*_=~–—-]+$/u.test(token));
}

function loadDefaultVocabulary() {
  if (!defaultVocabulary) {
    defaultVocabulary = Object.freeze(cleanCorpus(fs.readFileSync(CORPUS_PATH, 'utf8')));
  }
  return defaultVocabulary;
}

function validateCount(count, label = 'count') {
  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError(`${label} must be a non-negative integer`);
  }
}

function validateBounds(min, max, label) {
  validateCount(min, `${label} minimum`);
  validateCount(max, `${label} maximum`);
  if (min < 1 || max < 1) throw new RangeError(`${label} boundaries must be at least 1`);
  if (min > max) throw new RangeError(`${label} minimum must not exceed maximum`);
}

function validateRandom(random) {
  if (typeof random !== 'function') throw new TypeError('random must be a function');
}

function createSeededRandom(seed) {
  if (!Number.isFinite(seed)) throw new TypeError('seed must be a finite number');
  let state = seed >>> 0;
  return function seededRandom() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeVocabulary(words) {
  if (!Array.isArray(words) || words.length === 0 || words.some((word) => typeof word !== 'string' || !word.trim())) {
    throw new TypeError('words must be a non-empty array of non-empty strings');
  }
  const normalized = words.flatMap((word) => cleanCorpus(word));
  if (normalized.length === 0) throw new TypeError('words must contain at least one usable word');
  return normalized;
}

function chooseLength(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

class LoremIpsum {
  constructor(options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new TypeError('options must be an object');
    }
    const sentenceBounds = { min: 5, max: 15, ...options.wordsPerSentence };
    const paragraphBounds = { min: 3, max: 7, ...options.sentencesPerParagraph };
    validateBounds(sentenceBounds.min, sentenceBounds.max, 'sentence');
    validateBounds(paragraphBounds.min, paragraphBounds.max, 'paragraph');
    const random = options.random === undefined
      ? (options.seed === undefined ? Math.random : createSeededRandom(options.seed))
      : options.random;
    validateRandom(random);
    this.options = {
      wordsPerSentence: sentenceBounds,
      sentencesPerParagraph: paragraphBounds,
      random,
      words: options.words === undefined ? loadDefaultVocabulary() : normalizeVocabulary(options.words),
      avoidImmediateRepeats: options.avoidImmediateRepeats === true,
      previousWordIndex: -1,
    };
  }

  loadCorpus() {
    return loadDefaultVocabulary();
  }

  pickWord() {
    const { words, random, avoidImmediateRepeats } = this.options;
    let value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('random must return a number in the range [0, 1)');
    }
    let index = Math.floor(value * words.length);
    if (avoidImmediateRepeats && words.length > 1 && words[index] === words[this.options.previousWordIndex]) {
      value = random();
      if (!Number.isFinite(value) || value < 0 || value >= 1) {
        throw new RangeError('random must return a number in the range [0, 1)');
      }
      index = Math.floor(value * words.length);
      if (words[index] === words[this.options.previousWordIndex]) {
        index = words.findIndex((word) => word !== words[this.options.previousWordIndex]);
      }
    }
    this.options.previousWordIndex = index;
    return words[index];
  }

  generateWords(count) {
    validateCount(count);
    return Array.from({ length: count }, () => this.pickWord()).join(' ');
  }

  generateSentence() {
    const { min, max } = this.options.wordsPerSentence;
    const words = this.generateWords(chooseLength(this.options.random, min, max));
    if (!words) return '';
    return `${words.charAt(0).toLocaleUpperCase('nl-NL')}${words.slice(1).replace(/[.!?…]+$/u, '')}.`;
  }

  generateSentences(count) {
    validateCount(count);
    return Array.from({ length: count }, () => this.generateSentence()).join(' ');
  }

  generateParagraph() {
    const { min, max } = this.options.sentencesPerParagraph;
    return this.generateSentences(chooseLength(this.options.random, min, max));
  }

  generateParagraphs(count) {
    validateCount(count);
    return Array.from({ length: count }, () => this.generateParagraph()).join('\n\n');
  }
}

function loremIpsum(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }
  const {
    count = 1,
    format = 'plain',
    paragraphLowerBound = 3,
    paragraphUpperBound = 7,
    random,
    seed,
    sentenceLowerBound = 5,
    sentenceUpperBound = 15,
    suffix = '\n',
    units = 'sentences',
    words,
    avoidImmediateRepeats = false,
  } = options;
  validateCount(count);
  if (count === 0) return '';
  if (!['words', 'sentences', 'paragraphs'].includes(units)) throw new RangeError('units must be words, sentences, or paragraphs');
  if (!['plain', 'html'].includes(format)) throw new RangeError('format must be plain or html');
  if (typeof suffix !== 'string') throw new TypeError('suffix must be a string');
  if (random !== undefined) validateRandom(random);
  if (random !== undefined && seed !== undefined) {
    // Explicit custom random functions take precedence over seed.
  }
  const effectiveRandom = random === undefined ? (seed === undefined ? Math.random : createSeededRandom(seed)) : random;
  const lorem = new LoremIpsum({
    sentencesPerParagraph: { min: paragraphLowerBound, max: paragraphUpperBound },
    wordsPerSentence: { min: sentenceLowerBound, max: sentenceUpperBound },
    random: effectiveRandom,
    words,
    avoidImmediateRepeats,
  });
  let result;
  if (units === 'words') result = lorem.generateWords(count);
  else if (units === 'sentences') result = lorem.generateSentences(count);
  else result = lorem.generateParagraphs(count);

  if (format === 'html' && result) {
    result = result.split(/\n\n/u).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n');
  }
  return result + suffix;
}

module.exports = { LoremIpsum, loremIpsum };
