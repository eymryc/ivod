import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubscriptionStatusesService } from './subscription-statuses.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@ApiTags('Subscription Statuses')
@Controller('subscription-statuses')
export class SubscriptionStatusesController {
  constructor(private readonly subscriptionStatusesService: SubscriptionStatusesService) {}

  @Get()
  @ApiOperation({ summary: 'List subscription statuses' })
  list() {
    return this.subscriptionStatusesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one subscription status' })
  getOne(@Param('id') id: string) {
    return this.subscriptionStatusesService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create subscription status' })
  create(@Body() dto: CreateReferenceDto) {
    return this.subscriptionStatusesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update subscription status' })
  update(@Param('id') id: string, @Body() dto: UpdateReferenceDto) {
    return this.subscriptionStatusesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete subscription status' })
  remove(@Param('id') id: string) {
    return this.subscriptionStatusesService.remove(id);
  }
}
