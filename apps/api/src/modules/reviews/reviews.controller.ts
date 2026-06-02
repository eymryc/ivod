import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiProperty, ApiPropertyOptional, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
class CreateReviewDto {
  @ApiProperty({ example: 4 }) @IsInt() @Min(1) @Max(5) rating: number;
  @ApiPropertyOptional({ example: 'Super film' }) @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional({ example: 'Vraiment bien réalisé.' }) @IsOptional() @IsString() body?: string;
}
@ApiTags('Reviews') @Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}
  @Get('contents/:contentId') @ApiOperation({ summary: 'Avis pour un contenu' }) @ApiParam({ name: 'contentId' })
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  list(@Param('contentId') contentId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listForContent(contentId, +(page ?? 1), +(limit ?? 20));
  }
  @Post('contents/:contentId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @ApiOperation({ summary: 'Créer ou modifier un avis' }) @ApiParam({ name: 'contentId' }) @ApiBody({ type: CreateReviewDto })
  upsert(@CurrentUser('id') userId: string, @Param('contentId') contentId: string, @Body() dto: CreateReviewDto) {
    return this.service.upsert(userId, contentId, dto.rating, dto.title, dto.body);
  }
  @Delete('contents/:contentId') @ApiBearerAuth('BearerAuth') @UseGuards(JwtAuthGuard) @HttpCode(200) @ApiOperation({ summary: 'Supprimer mon avis' }) @ApiParam({ name: 'contentId' })
  delete(@CurrentUser('id') userId: string, @Param('contentId') contentId: string) { return this.service.delete(userId, contentId); }
}
