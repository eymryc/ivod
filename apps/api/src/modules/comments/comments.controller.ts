import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommentsService } from './comments.service';
class CreateCommentDto {
  @ApiProperty({ example: 'Excellent film !' }) @IsString() @MinLength(1) body: string;
  @ApiPropertyOptional({ example: 'cm9z...' }) @IsOptional() @IsString() parentId?: string;
}
class UpdateCommentDto { @ApiProperty({ example: 'Super film, je recommande !' }) @IsString() @MinLength(1) body: string; }
@ApiTags('Comments') @Controller('comments')
export class CommentsController {
  constructor(private readonly service: CommentsService) {}
  @Get('contents/:contentId') @ApiOperation({ summary: 'Commentaires d\'un contenu' }) @ApiParam({ name: 'contentId' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  list(@Param('contentId') id: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list(id, +(page ?? 1), +(limit ?? 20));
  }
  @Post('contents/:contentId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @ApiOperation({ summary: 'Ajouter un commentaire' }) @ApiParam({ name: 'contentId' }) @ApiBody({ type: CreateCommentDto })
  create(@CurrentUser('id') userId: string, @Param('contentId') contentId: string, @Body() dto: CreateCommentDto) {
    return this.service.create(userId, contentId, dto.body, dto.parentId);
  }
  @Patch(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @ApiOperation({ summary: 'Modifier un commentaire' }) @ApiParam({ name: 'id' }) @ApiBody({ type: UpdateCommentDto })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateCommentDto) { return this.service.update(userId, id, dto.body); }
  @Delete(':id') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @HttpCode(200) @ApiOperation({ summary: 'Supprimer un commentaire' }) @ApiParam({ name: 'id' })
  delete(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.service.delete(userId, id); }
}
