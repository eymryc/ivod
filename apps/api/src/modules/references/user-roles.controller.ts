import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { UserRolesService } from './user-roles.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@ApiTags('Roles')
@Controller(['roles', 'user-roles'])
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List roles' })
  list() {
    return this.userRolesService.list();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get one role' })
  getOne(@Param('id') id: string) {
    return this.userRolesService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create role' })
  create(@Body() dto: CreateReferenceDto) {
    return this.userRolesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update role' })
  update(@Param('id') id: string, @Body() dto: UpdateReferenceDto) {
    return this.userRolesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete role' })
  remove(@Param('id') id: string) {
    return this.userRolesService.remove(id);
  }
}
