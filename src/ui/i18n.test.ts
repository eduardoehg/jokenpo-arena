import { describe, expect, it } from 'vitest';
import { ENTITY_TYPES } from '../core/rules';
import {
  DEFAULT_LANGUAGE,
  HTML_LANG,
  isLanguage,
  language,
  LANGUAGES,
  MESSAGES,
  setLanguage,
  t,
  translate,
  typeLabel,
  type MessageKey,
} from './i18n';

const KEYS = Object.keys(MESSAGES.pt) as MessageKey[];

describe('dicionários', () => {
  it('cobre os dois idiomas', () => {
    expect(LANGUAGES).toEqual(['pt', 'en']);
    expect(Object.keys(MESSAGES).sort()).toEqual(['en', 'pt']);
  });

  it('tem exatamente as mesmas chaves nos dois idiomas', () => {
    // A completude do inglês já é garantida pelo tipo; isto pega o caminho
    // inverso, uma chave que só exista no inglês.
    expect(Object.keys(MESSAGES.en).sort()).toEqual(KEYS.slice().sort());
  });

  it('não tem tradução vazia', () => {
    for (const lang of LANGUAGES) {
      for (const key of KEYS) {
        expect(MESSAGES[lang][key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('traduz de fato: nenhuma chave é idêntica nos dois idiomas, exceto siglas', () => {
    // `speedLevel` e afins podem coincidir; o que interessa é que a maioria
    // mude — uma cópia literal do português significaria tradução esquecida.
    const differing = KEYS.filter(
      (key) => MESSAGES.pt[key] !== MESSAGES.en[key],
    );

    expect(differing.length).toBeGreaterThan(KEYS.length * 0.8);
  });

  it('define a tag BCP 47 de cada idioma', () => {
    expect(HTML_LANG).toEqual({ pt: 'pt-BR', en: 'en' });
  });
});

describe('translate', () => {
  it('devolve o texto do idioma pedido', () => {
    expect(translate('pt', 'startBattle')).toBe('INICIAR BATALHA');
    expect(translate('en', 'startBattle')).toBe('START BATTLE');
  });

  it('traduz as regras coerentemente com os nomes dos tipos', () => {
    expect(translate('en', 'rulePaper')).toContain(
      translate('en', 'typePaper'),
    );
    expect(translate('en', 'rulePaper')).toContain(translate('en', 'typeRock'));
    expect(translate('pt', 'ruleRock')).toContain(translate('pt', 'typeRock'));
  });
});

describe('idioma padrão', () => {
  it('é o inglês', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });

  it('é um dos idiomas suportados', () => {
    expect(LANGUAGES).toContain(DEFAULT_LANGUAGE);
  });
});

describe('isLanguage', () => {
  it('aceita só os idiomas suportados', () => {
    expect(isLanguage('pt')).toBe(true);
    expect(isLanguage('en')).toBe(true);
  });

  it('rejeita qualquer outra coisa', () => {
    for (const value of ['fr', 'pt-BR', '', null, undefined, 3, {}]) {
      expect(isLanguage(value)).toBe(false);
    }
  });
});

describe('idioma corrente', () => {
  it('troca o resultado de t() ao mudar de idioma', () => {
    setLanguage('pt');
    expect(language()).toBe('pt');
    expect(t('playAgain')).toBe('JOGAR DE NOVO');

    setLanguage('en');
    expect(language()).toBe('en');
    expect(t('playAgain')).toBe('PLAY AGAIN');
  });

  it('traduz o nome de cada tipo', () => {
    setLanguage('pt');
    expect(ENTITY_TYPES.map(typeLabel)).toEqual([
      'PEDRA',
      'PAPEL',
      'TESOURA',
    ]);

    setLanguage('en');
    expect(ENTITY_TYPES.map(typeLabel)).toEqual([
      'ROCK',
      'PAPER',
      'SCISSORS',
    ]);
  });

  it('tem nome para todo tipo, nos dois idiomas', () => {
    for (const lang of LANGUAGES) {
      setLanguage(lang);
      for (const type of ENTITY_TYPES) {
        expect(typeLabel(type).length).toBeGreaterThan(0);
      }
    }
  });
});
