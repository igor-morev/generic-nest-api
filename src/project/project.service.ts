import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { Page } from './page.entity';
import { ExportService } from 'src/export/export.service';
import {
  CreatePageDto,
  CreateProjectDto,
  ProjectDto,
  ProjectSummaryDto,
  SavePageDto,
  UpdateProjectDto,
} from './dto/project';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
    private exportService: ExportService,
  ) {}

  async create(ownerId: string, dto: CreateProjectDto): Promise<ProjectDto> {
    const project = this.projectRepository.create({
      name: dto.name,
      industry: dto.industry,
      ownerId,
      pages: [{ pageName: 'Home Page', layers: [] }],
    });

    const saved = await this.projectRepository.save(project);
    return this.toProjectDto(saved);
  }

  async findAllForUser(ownerId: string): Promise<ProjectSummaryDto[]> {
    const projects = await this.projectRepository.find({
      where: { ownerId },
      order: { updatedAt: 'DESC' },
    });

    return projects.map((project) => this.toProjectSummaryDto(project));
  }

  async findOne(id: string, ownerId: string): Promise<ProjectDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['pages'],
    });

    this.assertOwnership(project, ownerId);

    return this.toProjectDto(project!);
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['pages'],
    });

    this.assertOwnership(project, ownerId);

    Object.assign(project!, dto);
    const saved = await this.projectRepository.save(project!);

    return this.toProjectDto(saved);
  }

  async findPage(projectId: string, pageId: string, ownerId: string): Promise<Page> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    this.assertOwnership(project, ownerId);

    const page = await this.pageRepository.findOne({
      where: { id: pageId, projectId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  async savePage(
    projectId: string,
    pageId: string,
    ownerId: string,
    dto: SavePageDto,
  ): Promise<void> {
    const page = await this.findPage(projectId, pageId, ownerId);

    page.layers = dto.layers;
    await this.pageRepository.save(page);
  }

  async createPage(
    projectId: string,
    ownerId: string,
    dto: CreatePageDto,
  ): Promise<Page> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    this.assertOwnership(project, ownerId);

    const page = this.pageRepository.create({
      projectId,
      pageName: dto.pageName,
      layers: [],
    });

    return this.pageRepository.save(page);
  }

  async deletePage(
    projectId: string,
    pageId: string,
    ownerId: string,
  ): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['pages'],
    });

    this.assertOwnership(project, ownerId);

    const page = project.pages.find((p) => p.id === pageId);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    if (project.pages.length <= 1) {
      throw new BadRequestException('A project must have at least one page');
    }

    await this.pageRepository.delete({ id: pageId, projectId });
  }

  async publish(id: string, ownerId: string): Promise<ProjectDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['pages'],
    });

    this.assertOwnership(project, ownerId);

    project.publishedTheme = project.theme;
    project.pages = project.pages.map((page) => {
      page.publishedLayers = page.layers;
      return page;
    });
    project.status = 'published';
    project.publishedAt = new Date();

    const saved = await this.projectRepository.save(project);
    return this.toProjectDto(saved);
  }

  async unpublish(id: string, ownerId: string): Promise<ProjectDto> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['pages'],
    });

    this.assertOwnership(project, ownerId);

    project.status = 'draft';
    const saved = await this.projectRepository.save(project);

    return this.toProjectDto(saved);
  }

  /** Public path — no ownership check. Serves the frozen snapshot, not the live draft. */
  async getPublishedSite(projectId: string, pageId?: string): Promise<string> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['pages'],
    });

    if (!project || project.status !== 'published') {
      throw new NotFoundException('This site is not published');
    }

    const page = pageId
      ? project.pages.find((p) => p.id === pageId)
      : project.pages[0];

    if (!page || !page.publishedLayers || !project.publishedTheme) {
      throw new NotFoundException('Page not found');
    }

    return this.exportService.generateFullHtml(
      page.publishedLayers,
      project.publishedTheme,
      project.name,
    );
  }

  private assertOwnership(
    project: Project | null,
    ownerId: string,
  ): asserts project is Project {
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== ownerId) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private toProjectSummaryDto(project: Project): ProjectSummaryDto {
    return {
      id: project.id,
      name: project.name,
      industry: project.industry,
      status: project.status,
      updatedAt: project.updatedAt,
      publishedAt: project.publishedAt,
    };
  }

  private toProjectDto(project: Project): ProjectDto {
    // A theme change is project-wide, so it marks every page as changed too, not just the one
    // being edited — republishing would change how all of them render.
    const themeChanged =
      JSON.stringify(project.theme) !== JSON.stringify(project.publishedTheme);

    return {
      ...this.toProjectSummaryDto(project),
      theme: project.theme,
      pages: (project.pages || []).map((page) => ({
        id: page.id,
        pageName: page.pageName,
        hasUnpublishedChanges:
          project.status === 'published' &&
          (themeChanged ||
            JSON.stringify(page.layers) !== JSON.stringify(page.publishedLayers)),
      })),
    };
  }
}
