import { describe, it, expect } from 'vitest';
import { parseFilters, DonationFilters } from '../lib/parse-filters';

describe('parseFilters', () => {
  describe('donationType parsing', () => {
    it('parses valid monetary donationType', () => {
      const result = parseFilters({ donationType: 'monetary' });
      expect(result.donationType).toBe('monetary');
    });

    it('parses valid physical donationType', () => {
      const result = parseFilters({ donationType: 'physical' });
      expect(result.donationType).toBe('physical');
    });

    it('ignores invalid donationType', () => {
      const result = parseFilters({ donationType: 'invalid' });
      expect(result.donationType).toBeUndefined();
    });

    it('ignores empty donationType', () => {
      const result = parseFilters({ donationType: '' });
      expect(result.donationType).toBeUndefined();
    });

    it('ignores undefined donationType', () => {
      const result = parseFilters({ donationType: undefined });
      expect(result.donationType).toBeUndefined();
    });

    it('handles donationType as array', () => {
      const result = parseFilters({ donationType: ['monetary'] });
      expect(result.donationType).toBe('monetary');
    });

    it('ignores invalid donationType in array', () => {
      const result = parseFilters({ donationType: ['invalid', 'monetary'] });
      expect(result.donationType).toBeUndefined();
    });
  });

  describe('dateFrom parsing', () => {
    it('parses valid ISO date string', () => {
      const dateStr = '2026-03-01T00:00:00.000Z';
      const result = parseFilters({ dateFrom: dateStr });
      expect(result.dateFrom).toBeInstanceOf(Date);
      expect(result.dateFrom?.toISOString()).toBe(dateStr);
    });

    it('parses valid date string without time', () => {
      const result = parseFilters({ dateFrom: '2026-03-01' });
      expect(result.dateFrom).toBeInstanceOf(Date);
    });

    it('ignores invalid date string', () => {
      const result = parseFilters({ dateFrom: 'not-a-date' });
      expect(result.dateFrom).toBeUndefined();
    });

    it('ignores empty date string', () => {
      const result = parseFilters({ dateFrom: '' });
      expect(result.dateFrom).toBeUndefined();
    });

    it('handles dateFrom as array', () => {
      const dateStr = '2026-03-01T00:00:00.000Z';
      const result = parseFilters({ dateFrom: [dateStr] });
      expect(result.dateFrom).toBeInstanceOf(Date);
      expect(result.dateFrom?.toISOString()).toBe(dateStr);
    });
  });

  describe('dateTo parsing', () => {
    it('parses valid ISO date string', () => {
      const dateStr = '2026-03-31T23:59:59.999Z';
      const result = parseFilters({ dateTo: dateStr });
      expect(result.dateTo).toBeInstanceOf(Date);
      expect(result.dateTo?.toISOString()).toBe(dateStr);
    });

    it('parses valid date string without time', () => {
      const result = parseFilters({ dateTo: '2026-03-31' });
      expect(result.dateTo).toBeInstanceOf(Date);
    });

    it('ignores invalid date string', () => {
      const result = parseFilters({ dateTo: 'invalid-date' });
      expect(result.dateTo).toBeUndefined();
    });

    it('ignores empty date string', () => {
      const result = parseFilters({ dateTo: '' });
      expect(result.dateTo).toBeUndefined();
    });

    it('handles dateTo as array', () => {
      const dateStr = '2026-03-31T23:59:59.999Z';
      const result = parseFilters({ dateTo: [dateStr] });
      expect(result.dateTo).toBeInstanceOf(Date);
      expect(result.dateTo?.toISOString()).toBe(dateStr);
    });
  });

  describe('donorName parsing', () => {
    it('trims whitespace from donorName', () => {
      const result = parseFilters({ donorName: '  João Silva  ' });
      expect(result.donorName).toBe('João Silva');
    });

    it('ignores whitespace-only donorName', () => {
      const result = parseFilters({ donorName: '   ' });
      expect(result.donorName).toBeUndefined();
    });

    it('ignores empty donorName', () => {
      const result = parseFilters({ donorName: '' });
      expect(result.donorName).toBeUndefined();
    });

    it('ignores undefined donorName', () => {
      const result = parseFilters({ donorName: undefined });
      expect(result.donorName).toBeUndefined();
    });

    it('handles donorName as array', () => {
      const result = parseFilters({ donorName: ['João Silva'] });
      expect(result.donorName).toBe('João Silva');
    });

    it('handles special characters in donorName', () => {
      const result = parseFilters({ donorName: 'João da Silva, Jr.' });
      expect(result.donorName).toBe('João da Silva, Jr.');
    });
  });

  describe('page parsing', () => {
    it('parses valid page number', () => {
      const result = parseFilters({ page: '3' });
      expect(result.page).toBe(3);
    });

    it('defaults to 1 for page 0', () => {
      const result = parseFilters({ page: '0' });
      expect(result.page).toBe(1);
    });

    it('defaults to 1 for negative page', () => {
      const result = parseFilters({ page: '-1' });
      expect(result.page).toBe(1);
    });

    it('defaults to 1 for invalid page string', () => {
      const result = parseFilters({ page: 'abc' });
      expect(result.page).toBe(1);
    });

    it('defaults to 1 for empty page string', () => {
      const result = parseFilters({ page: '' });
      expect(result.page).toBe(1);
    });

    it('defaults to 1 when page is missing', () => {
      const result = parseFilters({});
      expect(result.page).toBe(1);
    });

    it('handles page as array', () => {
      const result = parseFilters({ page: ['5'] });
      expect(result.page).toBe(5);
    });

    it('defaults to 1 for invalid page in array', () => {
      const result = parseFilters({ page: ['invalid'] });
      expect(result.page).toBe(1);
    });

    it('handles large page numbers', () => {
      const result = parseFilters({ page: '999' });
      expect(result.page).toBe(999);
    });
  });

  describe('combined parameter parsing', () => {
    it('parses all parameters when all are valid', () => {
      const result = parseFilters({
        donationType: 'monetary',
        dateFrom: '2026-03-01T00:00:00.000Z',
        dateTo: '2026-03-31T23:59:59.999Z',
        donorName: 'João Silva',
        page: '2',
      });

      expect(result).toEqual({
        donationType: 'monetary',
        dateFrom: new Date('2026-03-01T00:00:00.000Z'),
        dateTo: new Date('2026-03-31T23:59:59.999Z'),
        donorName: 'João Silva',
        page: 2,
      });
    });

    it('omits invalid parameters and keeps valid ones', () => {
      const result = parseFilters({
        donationType: 'invalid',
        dateFrom: '2026-03-01',
        donorName: 'João',
        page: 'abc',
      });

      expect(result).toEqual({
        dateFrom: new Date('2026-03-01'),
        donorName: 'João',
        page: 1,
      });
    });

    it('returns only page when all other params are invalid', () => {
      const result = parseFilters({
        donationType: 'invalid',
        dateFrom: 'invalid',
        dateTo: 'invalid',
        donorName: '   ',
      });

      expect(result).toEqual({ page: 1 });
    });
  });

  describe('empty searchParams', () => {
    it('returns default page with no filters', () => {
      const result = parseFilters({});
      expect(result).toEqual({ page: 1 });
    });
  });

  describe('edge cases', () => {
    it('does not throw error on any invalid input', () => {
      expect(() => {
        parseFilters({
          donationType: 'anything',
          dateFrom: 'not a date',
          dateTo: 'also invalid',
          donorName: '\n\t  ',
          page: 'NaN',
        });
      }).not.toThrow();
    });

    it('handles array with multiple values by using first element', () => {
      const result = parseFilters({
        donationType: ['monetary', 'physical'],
      });
      expect(result.donationType).toBe('monetary');
    });

    it('handles numeric strings with leading zeros', () => {
      const result = parseFilters({ page: '007' });
      expect(result.page).toBe(7);
    });

    it('handles float page numbers by truncating', () => {
      const result = parseFilters({ page: '3.9' });
      expect(result.page).toBe(3);
    });
  });

  describe('interface compliance', () => {
    it('always returns object with page property', () => {
      const result = parseFilters({});
      expect('page' in result).toBe(true);
      expect(typeof result.page).toBe('number');
    });

    it('returned object conforms to DonationFilters interface', () => {
      const result: DonationFilters = parseFilters({
        donationType: 'monetary',
        dateFrom: '2026-03-01',
        dateTo: '2026-03-31',
        donorName: 'Test',
        page: '1',
      });

      expect(result).toBeDefined();
      // TypeScript compilation validates interface compliance
    });
  });
});
