import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRightsholderDto, UpdateRightsholderDto } from './dto/rightsholders.dto';
import { RightsholdersService } from './rightsholders.service';

@ApiTags('Rightsholders')
@ApiBearerAuth('BearerAuth')
@Controller('rightsholders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'JWT required' })
export class RightsholdersController {
  constructor(private readonly rightsholdersService: RightsholdersService) {}

  @Get()
  @Roles('ADMIN', 'CREATOR')
  @ApiOperation({
    summary: 'List rightsholders',
    description: 'Catalogue des ayants droit (lecture) pour le back-office et les créateurs (formulaires contenu).',
  })
  @ApiForbiddenResponse({ description: 'Rôle ADMIN ou CREATOR requis' })
  list() {
    return this.rightsholdersService.list();
  }

  @Get(':id')
  @Roles('ADMIN', 'CREATOR')
  @ApiOperation({ summary: 'Get rightsholder details' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123rightsholder1' })
  @ApiForbiddenResponse({ description: 'Rôle ADMIN ou CREATOR requis' })
  getOne(@Param('id') id: string) {
    return this.rightsholdersService.getOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create rightsholder' })
  @ApiBody({ type: CreateRightsholderDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  create(@Body() dto: CreateRightsholderDto) {
    return this.rightsholdersService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update rightsholder' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123rightsholder1' })
  @ApiBody({ type: UpdateRightsholderDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  update(@Param('id') id: string, @Body() dto: UpdateRightsholderDto) {
    return this.rightsholdersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete rightsholder' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123rightsholder1' })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  remove(@Param('id') id: string) {
    return this.rightsholdersService.remove(id);
  }
}
