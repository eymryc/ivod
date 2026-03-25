import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentStatusesService } from './content-statuses.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@ApiTags('Content Statuses')
@Controller('content-statuses')
export class ContentStatusesController {
  constructor(private readonly contentStatusesService: ContentStatusesService) {}

  @Get()
  @ApiOperation({ summary: 'List content statuses' })
  list() {
    return this.contentStatusesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one content status' })
  getOne(@Param('id') id: string) {
    return this.contentStatusesService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create content status' })
  create(@Body() dto: CreateReferenceDto) {
    return this.contentStatusesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content status' })
  update(@Param('id') id: string, @Body() dto: UpdateReferenceDto) {
    return this.contentStatusesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content status' })
  remove(@Param('id') id: string) {
    return this.contentStatusesService.remove(id);
  }
}
