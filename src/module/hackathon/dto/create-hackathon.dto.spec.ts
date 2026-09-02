import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateHackathonDto } from './create-hackathon.dto.js';

describe('CreateHackathonDto', () => {
  const getFutureDate = (daysAhead = 1) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString();
  };

  const getPastDate = (daysAgo = 1) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
  };

  it('validates successfully with valid inputs', async () => {
    const input = {
      name: 'AI Hackathon',
      description: 'A weekend hackathon exploring LLMs and agents.',
      startsAt: getFutureDate(2),
      endsAt: getFutureDate(4),
      isActive: true,
    };

    const dto = plainToInstance(CreateHackathonDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.startsAt).toBeInstanceOf(Date);
    expect(dto.endsAt).toBeInstanceOf(Date);
  });

  it('validates successfully with optional fields omitted', async () => {
    const input = {
      name: 'Hackathon 2026',
      startsAt: getFutureDate(1),
      endsAt: getFutureDate(3),
    };

    const dto = plainToInstance(CreateHackathonDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBe(0);
    expect(dto.description).toBeUndefined();
    expect(dto.isActive).toBeUndefined();
  });

  it('fails validation when name has less than 3 characters', async () => {
    const input = {
      name: 'AI',
      startsAt: getFutureDate(1),
      endsAt: getFutureDate(2),
    };

    const dto = plainToInstance(CreateHackathonDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const nameError = errors.find((e) => e.property === 'name');
    expect(nameError).toBeDefined();
    expect(nameError?.constraints?.minLanguages ?? nameError?.constraints?.isLength ?? nameError?.constraints?.minLength).toBeDefined();
  });

  it('fails validation when description is under 10 or over 1000 characters', async () => {
    const shortDescDto = plainToInstance(CreateHackathonDto, {
      name: 'Hackathon',
      description: 'Too short',
      startsAt: getFutureDate(1),
      endsAt: getFutureDate(2),
    });
    const shortErrors = await validate(shortDescDto);
    expect(shortErrors.find((e) => e.property === 'description')).toBeDefined();

    const longDescDto = plainToInstance(CreateHackathonDto, {
      name: 'Hackathon',
      description: 'a'.repeat(1001),
      startsAt: getFutureDate(1),
      endsAt: getFutureDate(2),
    });
    const longErrors = await validate(longDescDto);
    expect(longErrors.find((e) => e.property === 'description')).toBeDefined();
  });

  it('fails validation when dates are in the past', async () => {
    const input = {
      name: 'Hackathon',
      startsAt: getPastDate(2),
      endsAt: getPastDate(1),
    };

    const dto = plainToInstance(CreateHackathonDto, input);
    const errors = await validate(dto);

    expect(errors.find((e) => e.property === 'startsAt')).toBeDefined();
    expect(errors.find((e) => e.property === 'endsAt')).toBeDefined();
  });

  it('fails validation when isActive is not a boolean', async () => {
    const input = {
      name: 'Hackathon',
      startsAt: getFutureDate(1),
      endsAt: getFutureDate(2),
      isActive: 'not-a-boolean',
    };

    const dto = plainToInstance(CreateHackathonDto, input);
    const errors = await validate(dto);

    expect(errors.find((e) => e.property === 'isActive')).toBeDefined();
  });
});
