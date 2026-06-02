import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ContentTypesService } from './content-types.service';
import { CreateReferenceDto, UpdateReferenceDto } from './dto/references.dto';

@ApiTags('Content Types')
@Controller('content-types')
export class ContentTypesController {
  constructor(private readonly contentTypesService: ContentTypesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List content types' })
  list() {
    return this.contentTypesService.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one content type' })
  getOne(@Param('id') id: string) {
    return this.contentTypesService.getOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create content type' })
  create(@Body() dto: CreateReferenceDto) {
    return this.contentTypesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update content type' })
  update(@Param('id') id: string, @Body() dto: UpdateReferenceDto) {
    return this.contentTypesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content type' })
  remove(@Param('id') id: string) {
    return this.contentTypesService.remove(id);
  }
}
