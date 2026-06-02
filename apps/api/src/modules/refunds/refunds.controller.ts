import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RefundsService } from './refunds.service';
import { AdminRefundPaymentDto } from './dto/admin-refund.dto';

class RequestRefundDto {
  @ApiPropertyOptional({ example: 'Service non satisfaisant' })
  @IsOptional()
  @IsString()
  reason?: string;
}

class ProcessRefundDto {
  @ApiPropertyOptional({ enum: ['approve', 'reject'] })
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';
}

@ApiTags('Refunds')
@ApiBearerAuth('BearerAuth')
@Controller('refunds')
export class RefundsController {
  constructor(private readonly service: RefundsService) {}

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin — liste des remboursements' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  adminList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listAdmin({
      page: +(page ?? 1),
      limit: +(limit ?? 30),
      status,
    });
  }

  @Post('admin/payments/:paymentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin — rembourser un paiement Paystack (total)' })
  @ApiParam({ name: 'paymentId' })
  @ApiBody({ type: AdminRefundPaymentDto })
  adminRefundPayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: AdminRefundPaymentDto,
  ) {
    return this.service.adminRefundPayment(paymentId, dto);
  }

  @Patch('admin/:refundId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Admin — approuver/rejeter une demande viewer' })
  processAdmin(@Param('refundId') refundId: string, @Body() dto: ProcessRefundDto) {
    return this.service.processAdmin(refundId, dto.action);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mes demandes de remboursement' })
  list(@CurrentUser('id') userId: string) {
    return this.service.list(userId);
  }

  @Post(':paymentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Demander un remboursement (viewer)' })
  @ApiParam({ name: 'paymentId' })
  @ApiBody({ type: RequestRefundDto })
  request(
    @CurrentUser('id') userId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: RequestRefundDto,
  ) {
    return this.service.request(userId, paymentId, dto.reason);
  }
}
