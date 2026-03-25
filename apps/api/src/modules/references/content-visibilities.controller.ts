import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentVisibilitiesService } from './content-visibilities.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@ApiTags('Content Visibilities')
@Controller('content-visibilities')
export class ContentVisibilitiesController {
  constructor(private readonly contentVisibilitiesService: ContentVisibilitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List content visibilities' })
  list() {
    return this.contentVisibilitiesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one content visibility' })
  getOne(@Param('id') id: string) {
    return this.contentVisibilitiesService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create content visibility' })
  create(@Body() dto: CreateReferenceDto) {
    return this.contentVisibilitiesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content visibility' })
  update(@Param('id') id: string, @Body() dto: UpdateReferenceDto) {
    return this.contentVisibilitiesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content visibility' })
  remove(@Param('id') id: string) {
    return this.contentVisibilitiesService.remove(id);
  }
}
