import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

export class VerifyPinDto {
  @ApiProperty({ example: '1234' })
  @IsString() @Length(4, 6) pin!: string;
}

export class CreateProfileDto {
  @ApiProperty({ example: 'Romaric', description: 'Nom du profil (2-30 caractères)' })
  @IsString() @MinLength(2) @MaxLength(30) name!: string;

  @ApiPropertyOptional({ example: false, description: 'Profil enfant (active le contrôle parental)' })
  @IsOptional() @IsBoolean() isKids?: boolean;

  @ApiPropertyOptional({ example: 'fr', description: 'Code langue ISO' })
  @IsOptional() @IsString() languageCode?: string;

  @ApiPropertyOptional({ example: 'cm9z...', description: 'ID du niveau de maturité' })
  @IsOptional() @IsString() maturityRatingId?: string;

  @ApiPropertyOptional({ example: '1234', description: 'Code PIN à 4 chiffres (optionnel)' })
  @IsOptional() @IsString() @Length(4, 6) pin?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Romaric Jr' })
  @IsOptional() @IsString() @MinLength(2) @MaxLength(30) name?: string;

  @ApiPropertyOptional({ example: 'https://cdn.ivod.africa/avatars/1.jpg' })
  @IsOptional() @IsString() avatarUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isKids?: boolean;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional() @IsString() languageCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() maturityRatingId?: string;

  @ApiPropertyOptional({ example: '5678' })
  @IsOptional() @IsString() @Length(4, 6) pin?: string;
}

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  private readonly profilePublicSelect = {
    id: true,
    name: true,
    avatarUrl: true,
    isKids: true,
    isDefault: true,
    languageCode: true,
    createdAt: true,
    updatedAt: true,
    pin: true,
  } as const;

  private toPublicProfile<T extends { pin?: string | null }>(row: T) {
    const { pin, ...rest } = row;
    return { ...rest, hasPin: !!pin };
  }

  async listForUser(userId: string) {
    const rows = await this.prisma.profile.findMany({
      where: { userId },
      select: this.profilePublicSelect,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.toPublicProfile(r));
  }

  async create(userId: string, dto: CreateProfileDto) {
    const count = await this.prisma.profile.count({ where: { userId } });
    if (count >= 5) throw new BadRequestException({ code: 'PROFILE_002', message: 'Maximum 5 profils par compte' });

    const pinHash = dto.pin ? await hash(dto.pin, 10) : null;
    const row = await this.prisma.profile.create({
      data: {
        userId,
        name: dto.name,
        isKids: dto.isKids ?? false,
        languageCode: dto.languageCode,
        maturityRatingId: dto.maturityRatingId,
        isDefault: count === 0,
        pin: pinHash,
      },
      select: this.profilePublicSelect,
    });
    return this.toPublicProfile(row);
  }

  async update(userId: string, profileId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findFirst({ where: { id: profileId, userId } });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });

    const data: Record<string, unknown> = {
      name: dto.name,
      avatarUrl: dto.avatarUrl,
      isKids: dto.isKids,
      languageCode: dto.languageCode,
      maturityRatingId: dto.maturityRatingId,
    };
    if (dto.pin !== undefined) {
      data.pin = dto.pin ? await hash(dto.pin, 10) : null;
    }

    const row = await this.prisma.profile.update({
      where: { id: profileId },
      data,
      select: this.profilePublicSelect,
    });
    return this.toPublicProfile(row);
  }

  async verifyPin(userId: string, profileId: string, pin: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { id: profileId, userId },
      select: { id: true, pin: true },
    });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    if (!profile.pin) return { valid: true };

    const valid = await compare(pin, profile.pin);
    if (!valid) {
      throw new ForbiddenException({ code: 'PROFILE_PIN_001', message: 'Code PIN incorrect' });
    }
    return { valid: true };
  }

  async remove(userId: string, profileId: string) {
    const profile = await this.prisma.profile.findFirst({ where: { id: profileId, userId } });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    if (profile.isDefault) throw new ForbiddenException({ code: 'PROFILE_003', message: 'Impossible de supprimer le profil par défaut' });
    await this.prisma.profile.delete({ where: { id: profileId } });
    return { message: 'Profil supprimé' };
  }

  async setDefault(userId: string, profileId: string) {
    const profile = await this.prisma.profile.findFirst({ where: { id: profileId, userId } });
    if (!profile) throw new NotFoundException({ code: 'PROFILE_001', message: 'Profil introuvable' });
    await this.prisma.$transaction([
      this.prisma.profile.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.profile.update({ where: { id: profileId }, data: { isDefault: true } }),
    ]);
    return { message: 'Profil par défaut mis à jour' };
  }
}
