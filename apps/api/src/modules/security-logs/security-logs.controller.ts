import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SecurityLogsService } from './security-logs.service';

@ApiTags('Security Logs')
@ApiBearerAuth('BearerAuth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('security-logs')
export class SecurityLogsController {
  constructor(private readonly securityLogs: SecurityLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Journal des événements de sécurité (admin)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'action', required: false })
  list(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('search') search?: string,
    @Query('action') action?: string,
  ) {
    return this.securityLogs.list({
      page: +page,
      limit: +limit,
      search,
      action: action || undefined,
    });
  }
}
