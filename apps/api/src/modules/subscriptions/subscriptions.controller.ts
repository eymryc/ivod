import { Controller, Get, Post, Patch, Body, Param, UseGuards, HttpCode, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { CancelSubscriptionDto, CreateSubscriptionDto } from './dto/subscriptions.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'Lister les plans disponibles (public). includeFree=true pour inclure le plan gratuit en tête.' })
  listPlans(@Query('includeFree') includeFree?: string) {
    return this.service.listPlans(includeFree === 'true');
  }

  @Get('me')
  @ApiOperation({ summary: 'Abonnement actif de l\'utilisateur' })
  getActive(@CurrentUser('id') userId: string) {
    return this.service.getActive(userId);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Historique des abonnements' })
  getHistory(@CurrentUser('id') userId: string) {
    return this.service.getHistory(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Souscrire à un plan (Mobile Money / Stripe)' })
  subscribe(@CurrentUser('id') userId: string, @Body() dto: CreateSubscriptionDto) {
    return this.service.subscribe(userId, dto);
  }

  @Patch(':id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Annuler un abonnement' })
  @ApiParam({ name: 'id', example: 'cm9z...' })
  cancel(@CurrentUser('id') userId: string, @Param('id') subscriptionId: string, @Body() dto: CancelSubscriptionDto) {
    return this.service.cancel(userId, subscriptionId, dto);
  }
}
