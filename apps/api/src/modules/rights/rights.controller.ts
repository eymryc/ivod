import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiSuccessResponse } from '../../common/swagger/api-response.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateContentRightDto,
  CreateRightsContractDto,
  UpdateContentRightDto,
  UpdateRightsContractDto,
} from './dto/rights.dto';
import { RightsService } from './rights.service';

@ApiTags('Rights')
@ApiBearerAuth('BearerAuth')
@Controller('rights')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiUnauthorizedResponse({ description: 'JWT required' })
@ApiForbiddenResponse({ description: 'Admin role required' })
export class RightsController {
  constructor(private readonly rightsService: RightsService) {}

  @Get('contracts')
  @ApiOperation({ summary: 'List rights contracts' })
  listContracts() {
    return this.rightsService.listContracts();
  }

  @Get('contracts/:id')
  @ApiOperation({ summary: 'Get one rights contract' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123contract1' })
  getContract(@Param('id') id: string) {
    return this.rightsService.getContract(id);
  }

  @Post('contracts')
  @ApiOperation({ summary: 'Create rights contract' })
  @ApiBody({ type: CreateRightsContractDto })
  createContract(@Body() dto: CreateRightsContractDto) {
    return this.rightsService.createContract(dto);
  }

  @Patch('contracts/:id')
  @ApiOperation({ summary: 'Update rights contract' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123contract1' })
  @ApiBody({ type: UpdateRightsContractDto })
  updateContract(@Param('id') id: string, @Body() dto: UpdateRightsContractDto) {
    return this.rightsService.updateContract(id, dto);
  }

  @Delete('contracts/:id')
  @ApiOperation({ summary: 'Delete rights contract' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123contract1' })
  @ApiSuccessResponse({
    description: 'Rights contract deleted',
    example: { success: true, data: { id: 'cm9z2f5k10001x123contract1', message: 'Contrat supprimé' }, error: null },
  })
  removeContract(@Param('id') id: string) {
    return this.rightsService.removeContract(id);
  }

  @Get('content-rights')
  @ApiOperation({ summary: 'List content rights' })
  @ApiQuery({ name: 'contentId', required: false, example: 'cm9z2f5k10001x123content1' })
  listContentRights(@Query('contentId') contentId?: string) {
    return this.rightsService.listContentRights(contentId);
  }

  @Post('content-rights')
  @ApiOperation({ summary: 'Create content right' })
  @ApiBody({ type: CreateContentRightDto })
  createContentRight(@Body() dto: CreateContentRightDto) {
    return this.rightsService.createContentRight(dto);
  }

  @Patch('content-rights/:id')
  @ApiOperation({ summary: 'Update content right' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123right1' })
  @ApiBody({ type: UpdateContentRightDto })
  updateContentRight(@Param('id') id: string, @Body() dto: UpdateContentRightDto) {
    return this.rightsService.updateContentRight(id, dto);
  }

  @Delete('content-rights/:id')
  @ApiOperation({ summary: 'Delete content right' })
  @ApiParam({ name: 'id', example: 'cm9z2f5k10001x123right1' })
  @ApiSuccessResponse({
    description: 'Content right deleted',
    example: { success: true, data: { id: 'cm9z2f5k10001x123right1', message: 'Droit contenu supprimé' }, error: null },
  })
  removeContentRight(@Param('id') id: string) {
    return this.rightsService.removeContentRight(id);
  }
}
