import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentProvidersService } from './payment-providers.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@ApiTags('Payment Providers')
@Controller('payment-providers')
export class PaymentProvidersController {
  constructor(private readonly paymentProvidersService: PaymentProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List payment providers' })
  list() {
    return this.paymentProvidersService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one payment provider' })
  getOne(@Param('id') id: string) {
    return this.paymentProvidersService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create payment provider' })
  create(@Body() dto: CreateReferenceDto) {
    return this.paymentProvidersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment provider' })
  update(@Param('id') id: string, @Body() dto: UpdateReferenceDto) {
    return this.paymentProvidersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment provider' })
  remove(@Param('id') id: string) {
    return this.paymentProvidersService.remove(id);
  }
}
