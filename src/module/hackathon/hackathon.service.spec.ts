import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HackathonService } from './hackathon.service.js';
import { PrismaService } from '../../lib/database/prisma.service.js';

describe('HackathonService', () => {
  let service: HackathonService;
  let prisma: {
    hackathon: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    hackathonParticipant: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  const mockHackathon = {
    id: 'hackathon-1',
    name: 'Web3 Builder Hackathon',
    description: 'Build web3 apps with NestJS and Prisma',
    startDate: new Date(Date.now() + 86400000),
    endDate: new Date(Date.now() + 86400000 * 5),
    isActive: true,
    authorId: 'admin-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      id: 'admin-user-id',
      name: 'Admin',
      email: 'admin@example.com',
    },
    participants: [],
  };

  beforeEach(async () => {
    prisma = {
      hackathon: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      hackathonParticipant: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HackathonService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<HackathonService>(HackathonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a hackathon with authorId', async () => {
      prisma.hackathon.create.mockResolvedValue(mockHackathon);

      const dto = {
        name: 'Web3 Builder Hackathon',
        description: 'Build web3 apps with NestJS and Prisma',
        startsAt: new Date('2026-10-01'),
        endsAt: new Date('2026-10-05'),
        isActive: true,
      };

      const result = await service.create(dto, 'admin-user-id');

      expect(result).toEqual(mockHackathon);
      expect(prisma.hackathon.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
          startDate: dto.startsAt,
          endDate: dto.endsAt,
          isActive: dto.isActive,
          authorId: 'admin-user-id',
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all hackathons', async () => {
      prisma.hackathon.findMany.mockResolvedValue([mockHackathon]);

      const result = await service.findAll();

      expect(result).toEqual([mockHackathon]);
      expect(prisma.hackathon.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a hackathon if found', async () => {
      prisma.hackathon.findUnique.mockResolvedValue(mockHackathon);

      const result = await service.findOne('hackathon-1');

      expect(result).toEqual(mockHackathon);
      expect(prisma.hackathon.findUnique).toHaveBeenCalledWith({
        where: { id: 'hackathon-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when hackathon not found', async () => {
      prisma.hackathon.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the hackathon', async () => {
      prisma.hackathon.findUnique.mockResolvedValue(mockHackathon);
      prisma.hackathon.update.mockResolvedValue({
        ...mockHackathon,
        name: 'Updated Hackathon',
      });

      const result = await service.update('hackathon-1', {
        name: 'Updated Hackathon',
      });

      expect(result.name).toBe('Updated Hackathon');
      expect(prisma.hackathon.update).toHaveBeenCalledWith({
        where: { id: 'hackathon-1' },
        data: {
          name: 'Updated Hackathon',
        },
      });
    });
  });

  describe('remove', () => {
    it('should delete and return the hackathon', async () => {
      prisma.hackathon.findUnique.mockResolvedValue(mockHackathon);
      prisma.hackathon.delete.mockResolvedValue(mockHackathon);

      const result = await service.remove('hackathon-1');

      expect(result).toEqual(mockHackathon);
      expect(prisma.hackathon.delete).toHaveBeenCalledWith({
        where: { id: 'hackathon-1' },
      });
    });
  });

  describe('join', () => {
    it('should join hackathon successfully', async () => {
      const mockParticipant = {
        id: 'participant-1',
        hackathonId: 'hackathon-1',
        userId: 'user-2',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.hackathon.findUnique.mockResolvedValue(mockHackathon);
      prisma.hackathonParticipant.findUnique.mockResolvedValue(null);
      prisma.hackathonParticipant.create.mockResolvedValue(mockParticipant);

      const result = await service.join('hackathon-1', 'user-2');

      expect(result).toEqual(mockParticipant);
      expect(prisma.hackathonParticipant.create).toHaveBeenCalledWith({
        data: {
          hackathonId: 'hackathon-1',
          userId: 'user-2',
        },
      });
    });

    it('should throw NotFoundException if hackathon not found', async () => {
      prisma.hackathon.findUnique.mockResolvedValue(null);

      await expect(service.join('non-existent', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if hackathon isActive is false', async () => {
      prisma.hackathon.findUnique.mockResolvedValue({
        ...mockHackathon,
        isActive: false,
      });

      await expect(service.join('hackathon-1', 'user-2')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if hackathon has already ended', async () => {
      prisma.hackathon.findUnique.mockResolvedValue({
        ...mockHackathon,
        endDate: new Date(Date.now() - 86400000), // yesterday
      });

      await expect(service.join('hackathon-1', 'user-2')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if user already joined (duplicate)', async () => {
      prisma.hackathon.findUnique.mockResolvedValue(mockHackathon);
      prisma.hackathonParticipant.findUnique.mockResolvedValue({
        id: 'existing-id',
        hackathonId: 'hackathon-1',
        userId: 'user-2',
      });

      await expect(service.join('hackathon-1', 'user-2')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

