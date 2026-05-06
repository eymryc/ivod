import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadsService } from './uploads.service';

const ALLOWED_FOLDERS = new Set([
  'creators/avatar',
  'creators/banner',
  'content/thumbnail',
  'content/poster',
]);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

type PresignUploadDto = {
  folder: string;
  filename: string;
  contentType: string;
};

@ApiTags('Admin')
@ApiBearerAuth('BearerAuth')
@Controller('admin/uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiUnauthorizedResponse({ description: 'JWT required' })
@ApiForbiddenResponse({ description: 'Admin role required' })
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('presign')
  @ApiOperation({ summary: 'Presign S3/MinIO PUT upload (images uniquement)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['folder', 'filename', 'contentType'],
      properties: {
        folder: {
          type: 'string',
          enum: [...ALLOWED_FOLDERS],
          example: 'creators/avatar',
        },
        filename: { type: 'string', example: 'avatar.png' },
        contentType: {
          type: 'string',
          enum: [...ALLOWED_MIME_TYPES],
          example: 'image/png',
        },
      },
    },
  })
  presign(@Body() dto: PresignUploadDto) {
    if (!ALLOWED_FOLDERS.has(dto.folder)) {
      throw new BadRequestException({
        code: 'UPLOAD_001',
        message: `Dossier non autorisé. Valeurs acceptées : ${[...ALLOWED_FOLDERS].join(', ')}`,
      });
    }
    if (!ALLOWED_MIME_TYPES.has(dto.contentType)) {
      throw new BadRequestException({
        code: 'UPLOAD_002',
        message: `Type MIME non autorisé. Valeurs acceptées : ${[...ALLOWED_MIME_TYPES].join(', ')}`,
      });
    }
    return this.uploads.presignPut(dto);
  }
}

