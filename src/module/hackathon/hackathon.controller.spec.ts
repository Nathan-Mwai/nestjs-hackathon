import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HackathonController } from './hackathon.controller.js';
import { HackathonService } from './hackathon.service.js';
import { AuthGuard, type UserSession } from '@thallesp/nestjs-better-auth';

describe('HackathonController', () => {
  let controller: HackathonController;
  let hackathonService: {
    create: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    join: ReturnType<typeof vi.fn>;
  };

  const mockSession: UserSession = {
    user: {
      id: 'admin-id',
      email: 'admin@example.com',
      name: 'Admin User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'ADMIN',
    },
    session: {
      id: 'session-id',
      userId: 'admin-id',
      token: 'mock-token',
      expiresAt: new Date(Date.now() + 100000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockHackathon = {
    id: 'hackathon-1',
    name: 'Hackathon 2026',
    description: 'AI hackathon',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-05'),
    isActive: true,
    authorId: 'admin-id',
  };

  beforeEach(async () => {
    hackathonService = {
      create: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      join: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HackathonController],
      providers: [
        {
          provide: HackathonService,
          useValue: hackathonService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HackathonController>(HackathonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create passes DTO and logged-in user id to service', async () => {
    hackathonService.create.mockResolvedValue(mockHackathon);

    const dto = {
      name: 'Hackathon 2026',
      description: 'AI hackathon',
      startsAt: new Date('2026-10-01'),
      endsAt: new Date('2026-10-05'),
      isActive: true,
    };

    const result = await controller.create(dto, mockSession);

    expect(result).toEqual(mockHackathon);
    expect(hackathonService.create).toHaveBeenCalledWith(dto, 'admin-id');
  });

  it('findAll calls service.findAll', async () => {
    hackathonService.findAll.mockResolvedValue([mockHackathon]);

    const result = await controller.findAll();

    expect(result).toEqual([mockHackathon]);
    expect(hackathonService.findAll).toHaveBeenCalled();
  });

  it('findOne calls service.findOne', async () => {
    hackathonService.findOne.mockResolvedValue(mockHackathon);

    const result = await controller.findOne('hackathon-1');

    expect(result).toEqual(mockHackathon);
    expect(hackathonService.findOne).toHaveBeenCalledWith('hackathon-1');
  });

  it('update calls service.update', async () => {
    hackathonService.update.mockResolvedValue({
      ...mockHackathon,
      name: 'Updated Name',
    });

    const result = await controller.update('hackathon-1', {
      name: 'Updated Name',
    });

    expect(result.name).toBe('Updated Name');
    expect(hackathonService.update).toHaveBeenCalledWith('hackathon-1', {
      name: 'Updated Name',
    });
  });

  it('remove calls service.remove', async () => {
    hackathonService.remove.mockResolvedValue(mockHackathon);

    const result = await controller.remove('hackathon-1');

    expect(result).toEqual(mockHackathon);
    expect(hackathonService.remove).toHaveBeenCalledWith('hackathon-1');
  });

  it('join calls service.join with id and session user id', async () => {
    const mockParticipant = {
      id: 'part-1',
      hackathonId: 'hackathon-1',
      userId: 'participant-id',
    };
    hackathonService.join.mockResolvedValue(mockParticipant);

    const participantSession: UserSession = {
      ...mockSession,
      user: {
        ...mockSession.user,
        id: 'participant-id',
        role: 'PARTICIPANT',
      },
    };

    const result = await controller.join('hackathon-1', participantSession);

    expect(result).toEqual(mockParticipant);
    expect(hackathonService.join).toHaveBeenCalledWith(
      'hackathon-1',
      'participant-id',
    );
  });
});

