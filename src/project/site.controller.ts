import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from 'src/shared/decorators/public.decorator';
import { ProjectService } from './project.service';

/**
 * Public, unauthenticated surface for viewing a published site — deliberately a separate
 * controller/path from the authenticated `/project` API, so there's no risk of a route
 * collision or an authenticated route accidentally being reachable without a token.
 */
@Controller('site')
export class SiteController {
  constructor(private readonly projectService: ProjectService) {}

  @Public()
  @Get(':projectId')
  @Header('Content-Type', 'text/html')
  getHomePage(@Param('projectId') projectId: string) {
    return this.projectService.getPublishedSite(projectId);
  }

  @Public()
  @Get(':projectId/:pageId')
  @Header('Content-Type', 'text/html')
  getPage(@Param('projectId') projectId: string, @Param('pageId') pageId: string) {
    return this.projectService.getPublishedSite(projectId, pageId);
  }
}
