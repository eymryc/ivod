import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserPlansService } from './user-plans.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@ApiTags('Plans')
@Controller(['plans', 'user-plans'])
export class UserPlansController {
  constructor(private readonly userPlansService: UserPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List plans' })
  list() {
    return this.userPlansService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one plan' })
  getOne(@Param('id') id: string) {
    return this.userPlansService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create plan' })
  create(@Body() dto: CreateReferenceDto) {
    return this.userPlansService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update plan' })
  update(@Param('id') id: string, @Body() dto: UpdateReferenceDto) {
    return this.userPlansService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete plan' })
  remove(@Param('id') id: string) {
    return this.userPlansService.remove(id);
  }
}
