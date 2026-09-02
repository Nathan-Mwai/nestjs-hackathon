import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service.js';
import { CreateHackathonDto, UpdateHackathonDto } from './dto/index.js';

@Injectable()
export class HackathonService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createHackathonDto: CreateHackathonDto, authorId: string) {
    return this.prisma.hackathon.create({
      data: {
        name: createHackathonDto.name,
        description: createHackathonDto.description,
        startDate: createHackathonDto.startsAt,
        endDate: createHackathonDto.endsAt,
        isActive: createHackathonDto.isActive ?? true,
        authorId,
      },
    });
  }

  async findAll() {
    return this.prisma.hackathon.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            participants: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${id} not found`);
    }

    return hackathon;
  }

  async update(id: string, updateHackathonDto: UpdateHackathonDto) {
    await this.findOne(id);

    const { name, description, startsAt, endsAt, isActive } = updateHackathonDto;

    return this.prisma.hackathon.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(startsAt !== undefined && { startDate: startsAt }),
        ...(endsAt !== undefined && { endDate: endsAt }),
        ...(isActive !== undefined && { isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.hackathon.delete({
      where: { id },
    });
  }

  async join(hackathonId: string, userId: string) {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    if (!hackathon.isActive) {
      throw new BadRequestException('Hackathon is not active');
    }

    if (new Date() > new Date(hackathon.endDate)) {
      throw new BadRequestException('Hackathon has already ended');
    }

    const existingParticipant =
      await this.prisma.hackathonParticipant.findUnique({
        where: {
          hackathonId_userId: {
            hackathonId,
            userId,
          },
        },
      });

    if (existingParticipant) {
      throw new BadRequestException('You have already joined this hackathon');
    }

    try {
      return await this.prisma.hackathonParticipant.create({
        data: {
          hackathonId,
          userId,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('You have already joined this hackathon');
      }
      throw error;
    }
  }
}

