import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentStatusesService } from './payment-statuses.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@ApiTags('Payment Statuses')
@Controller('payment-statuses')
export class PaymentStatusesController {
  constructor(private readonly paymentStatusesService: PaymentStatusesService) {}

  @Get()
  @ApiOperation({ summary: 'List payment statuses' })
  list() {
    return this.paymentStatusesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one payment status' })
  getOne(@Param('id') id: string) {
    return this.paymentStatusesService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create payment status' })
  create(@Body() dto: CreateReferenceDto) {
    return this.paymentStatusesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment status' })
  update(@Param('id') id: string, @Body() dto: UpdateReferenceDto) {
    return this.paymentStatusesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment status' })
  remove(@Param('id') id: string) {
    return this.paymentStatusesService.remove(id);
  }
}
