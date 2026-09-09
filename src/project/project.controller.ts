import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import type { JwtPayload } from 'src/auth/types/jwt';
import type {
  CreatePageDto,
  CreateProjectDto,
  SavePageDto,
  UpdateProjectDto,
} from './dto/project';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post('create')
  create(
    @Request() req: { user: JwtPayload },
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectService.create(req.user.sub, dto);
  }

  @Get('list')
  list(@Request() req: { user: JwtPayload }) {
    return this.projectService.findAllForUser(req.user.sub);
  }

  @Get(':id')
  getOne(@Request() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.projectService.findOne(id, req.user.sub);
  }

  @Patch(':id')
  update(
    @Request() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.update(id, req.user.sub, dto);
  }

  @Get(':projectId/page/:pageId')
  getPage(
    @Request() req: { user: JwtPayload },
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.projectService.findPage(projectId, pageId, req.user.sub);
  }

  @Get(':projectId/page/:pageId/layers')
  async getLayers(
    @Request() req: { user: JwtPayload },
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
  ) {
    const page = await this.projectService.findPage(
      projectId,
      pageId,
      req.user.sub,
    );
    return page.layers;
  }

  @Put(':projectId/page/:pageId')
  savePage(
    @Request() req: { user: JwtPayload },
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
    @Body() dto: SavePageDto,
  ) {
    return this.projectService.savePage(
      projectId,
      pageId,
      req.user.sub,
      dto,
    );
  }

  @Post(':projectId/page')
  createPage(
    @Request() req: { user: JwtPayload },
    @Param('projectId') projectId: string,
    @Body() dto: CreatePageDto,
  ) {
    return this.projectService.createPage(projectId, req.user.sub, dto);
  }

  @Delete(':projectId/page/:pageId')
  deletePage(
    @Request() req: { user: JwtPayload },
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.projectService.deletePage(projectId, pageId, req.user.sub);
  }

  @Post(':id/publish')
  publish(@Request() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.projectService.publish(id, req.user.sub);
  }

  @Post(':id/unpublish')
  unpublish(@Request() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.projectService.unpublish(id, req.user.sub);
  }
}
